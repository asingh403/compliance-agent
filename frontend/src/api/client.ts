import { API_BASE_URL } from "./config";
import { ApiClientError } from "./errors";
import type { ApiErrorEnvelope, ApiResult, ApiSuccessEnvelope } from "./types";

interface ApiRequestOptions<TBody> {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: TBody;
  signal?: AbortSignal;
  requestId?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isSuccessEnvelope = <TData>(value: unknown): value is ApiSuccessEnvelope<TData> =>
  isRecord(value)
  && value.success === true
  && "data" in value
  && isRecord(value.meta)
  && typeof value.meta.requestId === "string";

const isErrorEnvelope = (value: unknown): value is ApiErrorEnvelope =>
  isRecord(value)
  && value.success === false
  && isRecord(value.error)
  && typeof value.error.code === "string"
  && typeof value.error.message === "string";

const parseResponseBody = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch (cause) {
    throw new ApiClientError({
      code: "INVALID_RESPONSE",
      message: "The backend returned an unreadable response",
      status: response.status,
      requestId: response.headers.get("x-request-id") ?? undefined,
      cause,
    });
  }
};

export const apiRequest = async <TData, TBody = never>(
  path: `/${string}`,
  options: ApiRequestOptions<TBody> = {},
): Promise<ApiResult<TData>> => {
  const headers = new Headers({ Accept: "application/json" });
  const blobBody = options.body instanceof Blob;
  const requestBody: BodyInit | undefined = options.body === undefined
    ? undefined
    : blobBody ? options.body as Blob : JSON.stringify(options.body);
  if (options.body !== undefined) {
    headers.set("Content-Type", blobBody ? (options.body as Blob).type || "application/octet-stream" : "application/json");
  }
  if (options.requestId) headers.set("x-request-id", options.requestId);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers,
      cache: "no-store",
      credentials: "omit",
      ...(requestBody === undefined ? {} : { body: requestBody }),
      ...(options.signal ? { signal: options.signal } : {}),
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") {
      throw new ApiClientError({
        code: "REQUEST_ABORTED",
        message: "The request was cancelled",
        status: 0,
        cause,
      });
    }
    throw new ApiClientError({
      code: "NETWORK_ERROR",
      message: "The backend is currently unreachable",
      status: 0,
      cause,
    });
  }

  const responseRequestId = response.headers.get("x-request-id") ?? undefined;
  const payload = await parseResponseBody(response);

  if (!response.ok) {
    if (isErrorEnvelope(payload)) {
      throw new ApiClientError({
        code: payload.error.code,
        message: payload.error.message,
        status: response.status,
        requestId: payload.error.requestId ?? responseRequestId,
        details: payload.error.details,
      });
    }
    throw new ApiClientError({
      code: "HTTP_ERROR",
      message: `The backend request failed with status ${response.status}`,
      status: response.status,
      requestId: responseRequestId,
    });
  }

  if (!isSuccessEnvelope<TData>(payload)) {
    throw new ApiClientError({
      code: "INVALID_RESPONSE",
      message: "The backend response did not match the expected success envelope",
      status: response.status,
      requestId: responseRequestId,
    });
  }

  return {
    data: payload.data,
    requestId: payload.meta.requestId || responseRequestId || "",
    status: response.status,
  };
};
