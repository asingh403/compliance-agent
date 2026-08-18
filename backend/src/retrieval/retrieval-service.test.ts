import { describe, expect, it, vi } from "vitest";
import { RetrievalService } from "./retrieval-service.js";

describe("RetrievalService", () => {
  it("embeds once and returns score-transparent source evidence", async () => {
    const embedder = {
      modelName: "mistral-embed",
      embedDocuments: vi.fn(),
      embedQuery: vi.fn().mockResolvedValue(Array(1024).fill(0.1)),
    };
    const repository = {
      findSimilar: vi.fn().mockResolvedValue([{
        standard: "GDPR",
        clauseId: "Article 17",
        title: "Right to erasure",
        text: "The data subject shall have the right to obtain erasure.",
        sourceUrl: "https://eur-lex.europa.eu/gdpr#art_17",
        version: 1,
        vectorScore: 0.89,
      }]),
    };
    const reranker = {
      rerank: vi.fn().mockRejectedValue(new Error("provider unavailable")),
    };
    const service = new RetrievalService(embedder, repository, reranker);
    const response = await service.retrieve({
      requirement: "Users can delete their personal data",
      standards: ["GDPR"],
      topK: 10,
      similarityThreshold: 0.65,
    }, "request-1");

    expect(embedder.embedQuery).toHaveBeenCalledOnce();
    expect(response.results[0]).toMatchObject({
      clauseId: "Article 17",
      vectorScore: 0.89,
      rerankingScore: null,
      finalScore: 0.89,
      sourceUrl: "https://eur-lex.europa.eu/gdpr#art_17",
    });
    expect(response.results[0]?.evidence).toHaveLength(1);
    expect(response.retrieval).toMatchObject({
      embeddingModel: "mistral-embed",
      rerankingProvider: null,
      rerankingApplied: false,
      resultSource: "vector-search",
      fallback: { applied: true, reason: "RERANKING_UNAVAILABLE" },
    });
  });

  it("returns reranked evidence and transparent final scores", async () => {
    const candidate = {
      standard: "GDPR" as const,
      clauseId: "Article 17",
      title: "Right to erasure",
      text: "The data subject has the right to obtain erasure.",
      sourceUrl: "https://eur-lex.europa.eu/gdpr#art_17",
      version: 1,
      vectorScore: 0.8,
    };
    const service = new RetrievalService(
      {
        modelName: "mistral-embed",
        embedDocuments: vi.fn(),
        embedQuery: vi.fn().mockResolvedValue(Array(1024).fill(0.1)),
      },
      { findSimilar: vi.fn().mockResolvedValue([candidate]) },
      {
        rerank: vi.fn().mockResolvedValue({
          provider: "groq",
          modelName: "test-groq",
          assessments: [{
            clauseId: "Article 17",
            relevanceScore: 0.9,
            reason: "It directly covers a deletion request.",
            relevantExcerpt: "right to obtain erasure",
          }],
        }),
      },
    );
    const response = await service.retrieve({
      requirement: "Delete user data",
      standards: ["GDPR"],
      topK: 10,
      similarityThreshold: 0.65,
    }, "request-2");

    expect(response.results[0]).toMatchObject({
      rerankingScore: 0.9,
      finalScore: 0.865,
      excerpt: "right to obtain erasure",
      explanation: "It directly covers a deletion request.",
    });
    expect(response.retrieval).toMatchObject({
      rerankingModel: "test-groq",
      rerankingProvider: "groq",
      rerankingApplied: true,
      resultSource: "reranked",
    });
  });
});
