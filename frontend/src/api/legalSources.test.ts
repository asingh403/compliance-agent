import { afterEach, describe, expect, it, vi } from "vitest";
import { startEuAiActIngestion, startEuAiActScrape, startGdprIngestion, startGdprScrape } from "./legalSources";

afterEach(() => vi.unstubAllGlobals());

describe("legal source API", () => {
  it("starts a bodyless GDPR scrape request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: {
        standard: "GDPR",
        sourceUrl: "https://eur-lex.europa.eu/gdpr",
        scrapedAt: "2026-08-18T00:00:00.000Z",
        clauseCount: 99,
        stagingArtifact: "gdpr.normalized.json",
      },
      meta: { requestId: "scrape-request" },
    }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(startGdprScrape()).resolves.toMatchObject({ status: 201, requestId: "scrape-request" });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:5001/api/v1/legal-sources/gdpr/scrapes",
      expect.objectContaining({ method: "POST" }),
    );
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(request.body).toBeUndefined();
  });

  it("accepts a 207 partial GDPR ingestion response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: {
        standard: "GDPR",
        total: 99,
        created: 0,
        updated: 2,
        unchanged: 96,
        failed: 1,
        failures: [{ clauseId: "Article 17", code: "CLAUSE_PERSISTENCE_FAILED" }],
        embeddingModel: "mistral-embed",
      },
      meta: { requestId: "ingestion-request" },
    }), { status: 207 })));

    await expect(startGdprIngestion()).resolves.toMatchObject({
      status: 207,
      requestId: "ingestion-request",
      data: { failed: 1 },
    });
  });

  it("starts a bodyless EU AI Act scrape request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: {
        standard: "EU_AI_ACT",
        sourceUrl: "https://eur-lex.europa.eu/eli/reg/2024/1689/oj/eng",
        scrapedAt: "2026-08-18T00:20:00.000Z",
        clauseCount: 113,
        stagingArtifact: "eu-ai-act.normalized.json",
      },
      meta: { requestId: "eu-scrape-request" },
    }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(startEuAiActScrape()).resolves.toMatchObject({ status: 201, requestId: "eu-scrape-request" });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:5001/api/v1/legal-sources/eu-ai-act/scrapes",
      expect.objectContaining({ method: "POST" }),
    );
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(request.body).toBeUndefined();
  });

  it("accepts a 207 partial EU AI Act ingestion response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: {
        standard: "EU_AI_ACT",
        total: 113,
        created: 110,
        updated: 0,
        unchanged: 2,
        failed: 1,
        failures: [{ clauseId: "Article 6", code: "CLAUSE_PERSISTENCE_FAILED" }],
        embeddingModel: "mistral-embed",
      },
      meta: { requestId: "eu-ingestion-request" },
    }), { status: 207 })));

    await expect(startEuAiActIngestion()).resolves.toMatchObject({
      status: 207,
      requestId: "eu-ingestion-request",
      data: { standard: "EU_AI_ACT", failed: 1 },
    });
  });
});
