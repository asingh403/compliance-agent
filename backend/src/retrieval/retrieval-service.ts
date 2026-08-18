import { env } from "../config/env.js";
import type { LegalStandard, RetrievalCandidate } from "../domain/legal-clause.js";
import { embeddingService, type EmbeddingProvider } from "../embeddings/embedding-service.js";
import { AppError } from "../lib/app-error.js";
import { logger } from "../lib/logger.js";
import { clauseRepository } from "../repositories/clause-repository.js";
import { rerankingService, type Reranker } from "../reranking/reranking-service.js";
import type { RerankingProvider } from "../reranking/reranking-service.js";
import type { ComplianceResult, ComplianceRetrievalRequest } from "./retrieval-contract.js";
import { calculateCoverage, calculateFinalScore, clampScore } from "./scoring.js";

interface VectorRepository {
  findSimilar(
    standard: LegalStandard,
    queryVector: number[],
    topK: number,
    similarityThreshold: number,
  ): Promise<RetrievalCandidate[]>;
}

const excerpt = (text: string, maximumLength = 1_200) => {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length <= maximumLength
    ? normalized
    : `${normalized.slice(0, maximumLength).trimEnd()}…`;
};

const vectorResult = (candidate: RetrievalCandidate): ComplianceResult => {
  const legalExcerpt = excerpt(candidate.text);
  const evidence = {
    standard: candidate.standard,
    clauseId: candidate.clauseId,
    title: candidate.title,
    excerpt: legalExcerpt,
    sourceUrl: candidate.sourceUrl,
  };
  const vectorScore = clampScore(candidate.vectorScore);
  return {
    ...evidence,
    vectorScore,
    rerankingScore: null,
    finalScore: vectorScore,
    explanation: "Retrieved from the legal corpus based on semantic similarity to the requirement.",
    evidence: [evidence],
  };
};

export interface RetrievalResponse {
  results: ComplianceResult[];
  coverage: {
    score: number;
    type: "indicative-retrieval-coverage";
    disclaimer: string;
  };
  retrieval: {
    embeddingModel: string;
    rerankingModel: string | null;
    rerankingProvider: RerankingProvider | null;
    rerankingApplied: boolean;
    resultSource: "reranked" | "vector-search";
    topK: number;
    similarityThreshold: number;
    fallback?: { applied: true; reason: string };
    rerankingFallback?: { applied: true; from: "groq"; to: "cohere"; reason: string };
  };
}

export class RetrievalService {
  constructor(
    private readonly embedder: EmbeddingProvider = embeddingService,
    private readonly repository: VectorRepository = clauseRepository,
    private readonly reranker: Reranker = rerankingService,
  ) {}

  async retrieve(input: ComplianceRetrievalRequest, requestId: string): Promise<RetrievalResponse> {
    const totalStartedAt = performance.now();
    const embeddingStartedAt = performance.now();
    const queryVector = await this.embedder.embedQuery(input.requirement);
    const embeddingLatency = performance.now() - embeddingStartedAt;

    const vectorStartedAt = performance.now();
    const groups = await Promise.all(input.standards.map((standard) =>
      this.repository.findSimilar(standard, queryVector, input.topK, input.similarityThreshold)));
    const vectorSearchLatency = performance.now() - vectorStartedAt;
    const candidates = groups.flat()
      .sort((left, right) => right.vectorScore - left.vectorScore)
      .slice(0, input.topK);

    let results = candidates.map(vectorResult);
    let rerankingApplied = false;
    let resultSource: "reranked" | "vector-search" = "vector-search";
    let fallback: { applied: true; reason: string } | undefined;
    let rerankingModel: string | null = null;
    let rerankingProvider: RerankingProvider | null = null;
    let rerankingFallback: { applied: true; from: "groq"; to: "cohere"; reason: string } | undefined;
    let rerankingLatency = 0;

    if (candidates.length > 0) {
      const rerankCandidates = candidates.slice(0, env.RERANK_CANDIDATE_COUNT);
      const rerankingStartedAt = performance.now();
      try {
        const outcome = await this.reranker.rerank(input.requirement, rerankCandidates);
        const assessments = outcome.assessments;
        const candidateById = new Map(rerankCandidates.map((candidate) => [candidate.clauseId, candidate]));
        results = assessments
          .filter((assessment) => assessment.relevanceScore >= env.RERANK_THRESHOLD)
          .map((assessment): ComplianceResult => {
            const candidate = candidateById.get(assessment.clauseId);
            if (!candidate) {
              throw new AppError(502, "RERANKING_OUTPUT_INVALID", "Reranking output referenced an unknown clause");
            }
            const evidence = {
              standard: candidate.standard,
              clauseId: candidate.clauseId,
              title: candidate.title,
              excerpt: assessment.relevantExcerpt,
              sourceUrl: candidate.sourceUrl,
            };
            const vectorScore = clampScore(candidate.vectorScore);
            return {
              ...evidence,
              vectorScore,
              rerankingScore: assessment.relevanceScore,
              finalScore: calculateFinalScore(vectorScore, assessment.relevanceScore),
              explanation: assessment.reason,
              evidence: [evidence],
            };
          })
          .sort((left, right) => right.finalScore - left.finalScore);
        rerankingApplied = true;
        rerankingModel = outcome.modelName;
        rerankingProvider = outcome.provider;
        if (outcome.fallback) {
          rerankingFallback = {
            applied: true,
            from: outcome.fallback.from,
            to: "cohere",
            reason: outcome.fallback.reason,
          };
        }
        resultSource = "reranked";
      } catch (error) {
        fallback = {
          applied: true,
          reason: error instanceof AppError ? error.code : "RERANKING_UNAVAILABLE",
        };
      } finally {
        rerankingLatency = performance.now() - rerankingStartedAt;
      }
    }

    logger.info("compliance_retrieved", {
      requestId,
      operation: "retrieve",
      standards: input.standards,
      requirementLength: input.requirement.length,
      candidateCount: candidates.length,
      returnedCount: results.length,
      embeddingLatencyMs: Math.round(embeddingLatency * 100) / 100,
      vectorSearchLatencyMs: Math.round(vectorSearchLatency * 100) / 100,
      rerankingLatencyMs: Math.round(rerankingLatency * 100) / 100,
      totalLatencyMs: Math.round((performance.now() - totalStartedAt) * 100) / 100,
      embeddingModel: this.embedder.modelName,
      rerankingModel,
      rerankingProvider,
      rerankingApplied,
      fallbackReason: fallback?.reason,
      rerankingFallbackFrom: rerankingFallback?.from,
    });

    return {
      results,
      coverage: {
        score: calculateCoverage(results.map((result) => result.finalScore), env.COVERAGE_TARGET),
        type: "indicative-retrieval-coverage",
        disclaimer: "This score indicates retrieved evidence coverage and is not a legal compliance determination.",
      },
      retrieval: {
        embeddingModel: this.embedder.modelName,
        rerankingModel,
        rerankingProvider,
        rerankingApplied,
        resultSource,
        topK: input.topK,
        similarityThreshold: input.similarityThreshold,
        ...(fallback ? { fallback } : {}),
        ...(rerankingFallback ? { rerankingFallback } : {}),
      },
    };
  }
}

export const retrievalService = new RetrievalService();
