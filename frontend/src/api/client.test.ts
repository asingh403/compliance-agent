import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client";
import { ApiClientError } from "./errors";
import { getHealth, getReadiness } from "./health";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("API client", () => {
  it("returns typed data, status, and envelope request ID", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: {
        status: "ok",
        service: "compliance-coverage-agent-backend",
        environment: "test",
        timestamp: "2026-08-18T00:00:00.000Z",
      },
      meta: { requestId: "request-from-body" },
    }), {
      status: 200,
      headers: { "content-type": "application/json", "x-request-id": "request-from-header" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getHealth()).resolves.toMatchObject({
      data: { status: "ok" },
      requestId: "request-from-body",
      status: 200,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:5001/api/v1/health",
      expect.objectContaining({ method: "GET", credentials: "omit" }),
    );
  });

  it("normalizes backend errors and captures request IDs", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: false,
      error: {
        code: "DEPENDENCY_UNAVAILABLE",
        message: "MongoDB readiness check failed",
        requestId: "readiness-request",
      },
    }), { status: 503 })));

    const error = await getReadiness().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiClientError);
    expect(error).toMatchObject({
      code: "DEPENDENCY_UNAVAILABLE",
      status: 503,
      requestId: "readiness-request",
      retryable: true,
    });
  });

  it("normalizes unreachable backend failures without leaking causes", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("connection refused")));
    await expect(apiRequest("/health")).rejects.toMatchObject({
      code: "NETWORK_ERROR",
      message: "The backend is currently unreachable",
      status: 0,
      retryable: true,
    });
  });

  it("rejects malformed success envelopes", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: { status: "ok" },
    }), { status: 200, headers: { "x-request-id": "header-only" } })));

    await expect(getHealth()).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
      requestId: "header-only",
    });
  });
});
