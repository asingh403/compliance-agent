import { afterEach, describe, expect, it, vi } from "vitest";
import { retrieveCompliance } from "./compliance";

afterEach(() => vi.unstubAllGlobals());

describe("compliance API", () => {
  it("posts retrieval settings in the JSON body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: {
        results: [],
        coverage: {
          score: 0,
          type: "indicative-retrieval-coverage",
          disclaimer: "Not a legal compliance determination.",
        },
        retrieval: {
          embeddingModel: "mistral-embed",
          rerankingModel: null,
          rerankingProvider: null,
          rerankingApplied: false,
          resultSource: "vector-search",
          topK: 10,
          similarityThreshold: 0.65,
        },
      },
      meta: { requestId: "retrieval-request" },
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const request = {
      requirement: "Users can request deletion of personal data.",
      standards: ["GDPR", "EU_AI_ACT"] as const,
      topK: 10,
      similarityThreshold: 0.65,
    };
    await expect(retrieveCompliance({ ...request, standards: [...request.standards] })).resolves.toMatchObject({
      requestId: "retrieval-request",
      data: { results: [] },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:5001/api/v1/compliance/retrieve",
      expect.objectContaining({ method: "POST", body: JSON.stringify(request) }),
    );
  });
});
