import { describe, expect, it, vi } from "vitest";
import { AppError } from "../lib/app-error.js";
import {
  CohereReranker,
  FallbackRerankingService,
  validateRerankOutput,
  type Reranker,
} from "./reranking-service.js";

const candidates = [{
  standard: "GDPR" as const,
  clauseId: "Article 17",
  title: "Right to erasure",
  text: "The data subject shall have the right to obtain erasure without undue delay.",
  sourceUrl: "https://eur-lex.europa.eu/gdpr#art_17",
  version: 1,
  vectorScore: 0.88,
}];

describe("reranking output validation", () => {
  it("accepts known clauses and source-grounded excerpts", () => {
    expect(validateRerankOutput(candidates, {
      assessments: [{
        clauseId: "Article 17",
        relevanceScore: 0.95,
        reason: "The requirement concerns deletion of personal data.",
        relevantExcerpt: "right to obtain erasure without undue delay",
      }],
    })[0]?.relevanceScore).toBe(0.95);
  });

  it("rejects fabricated excerpts", () => {
    expect(() => validateRerankOutput(candidates, {
      assessments: [{
        clauseId: "Article 17",
        relevanceScore: 0.95,
        reason: "Relevant",
        relevantExcerpt: "This quotation does not exist in the source.",
      }],
    })).toThrow(AppError);
  });
});

describe("Cohere reranking fallback", () => {
  it("maps Cohere document indexes and scores back to source-grounded clauses", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      results: [{ index: 0, relevance_score: 0.93 }],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const reranker = new CohereReranker("test-key", "rerank-v4.0-fast", fetcher as typeof fetch);

    const outcome = await reranker.rerank("Users can delete their personal data", candidates);

    expect(outcome).toMatchObject({
      provider: "cohere",
      modelName: "rerank-v4.0-fast",
      assessments: [{ clauseId: "Article 17", relevanceScore: 0.93 }],
    });
    expect(outcome.assessments[0]?.relevantExcerpt).toBe(candidates[0]?.text);
    expect(fetcher).toHaveBeenCalledWith("https://api.cohere.com/v2/rerank", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ Authorization: "Bearer test-key" }),
    }));
  });

  it("uses Cohere and records provider provenance when Groq fails", async () => {
    const primary: Reranker = {
      rerank: vi.fn().mockRejectedValue(new AppError(503, "RERANKING_UNAVAILABLE", "Groq unavailable")),
    };
    const secondary: Reranker = {
      rerank: vi.fn().mockResolvedValue({
        provider: "cohere",
        modelName: "rerank-v4.0-fast",
        assessments: [{
          clauseId: "Article 17",
          relevanceScore: 0.91,
          reason: "Cohere reranking identified this clause as relevant to the requirement.",
          relevantExcerpt: candidates[0]!.text,
        }],
      }),
    };

    const outcome = await new FallbackRerankingService(primary, secondary)
      .rerank("Delete personal data", candidates);

    expect(outcome.provider).toBe("cohere");
    expect(outcome.fallback).toEqual({ from: "groq", reason: "RERANKING_UNAVAILABLE" });
    expect(primary.rerank).toHaveBeenCalledOnce();
    expect(secondary.rerank).toHaveBeenCalledOnce();
  });
});
