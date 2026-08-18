const retryableCodes = new Set([
  "NETWORK_ERROR",
  "DEPENDENCY_UNAVAILABLE",
  "SCRAPE_SOURCE_UNAVAILABLE",
  "EMBEDDING_UNAVAILABLE",
  "VECTOR_SEARCH_FAILED",
  "RERANKING_UNAVAILABLE",
  "RATE_LIMIT_EXCEEDED",
  "INTERNAL_ERROR",
]);

interface ApiClientErrorOptions {
  code: string;
  message: string;
  status: number;
  requestId?: string | undefined;
  details?: unknown;
  cause?: unknown;
}

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly requestId: string | undefined;
  readonly details: unknown;
  readonly retryable: boolean;

  constructor(options: ApiClientErrorOptions) {
    super(options.message, { cause: options.cause });
    this.name = "ApiClientError";
    this.code = options.code;
    this.status = options.status;
    this.requestId = options.requestId;
    this.details = options.details;
    this.retryable = options.status === 0
      || options.status === 429
      || options.status >= 500
      || retryableCodes.has(options.code);
  }
}

export const isApiClientError = (error: unknown): error is ApiClientError =>
  error instanceof ApiClientError;
