import { apiRequest } from "./client";
import { ApiClientError } from "./errors";
import type { ComplianceRetrievalData, ComplianceRetrievalRequest } from "./types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isStandard = (value: unknown) => value === "GDPR" || value === "EU_AI_ACT";

const isEvidence = (value: unknown): value is Record<string, unknown> => isRecord(value)
  && isStandard(value.standard)
  && typeof value.clauseId === "string"
  && typeof value.title === "string"
  && typeof value.excerpt === "string"
  && typeof value.sourceUrl === "string";

const isResult = (value: unknown): value is Record<string, unknown> => isEvidence(value)
  && typeof value.vectorScore === "number"
  && (typeof value.rerankingScore === "number" || value.rerankingScore === null)
  && typeof value.finalScore === "number"
  && typeof value.explanation === "string"
  && Array.isArray(value.evidence)
  && value.evidence.every(isEvidence);

const isRetrievalData = (value: unknown): value is ComplianceRetrievalData => {
  if (!isRecord(value) || !Array.isArray(value.results) || !value.results.every(isResult)) return false;
  if (!isRecord(value.coverage)
    || typeof value.coverage.score !== "number"
    || value.coverage.type !== "indicative-retrieval-coverage"
    || typeof value.coverage.disclaimer !== "string") return false;
  if (!isRecord(value.retrieval)
    || typeof value.retrieval.embeddingModel !== "string"
    || !(typeof value.retrieval.rerankingModel === "string" || value.retrieval.rerankingModel === null)
    || !(value.retrieval.rerankingProvider === "groq"
      || value.retrieval.rerankingProvider === "cohere"
      || value.retrieval.rerankingProvider === null)
    || typeof value.retrieval.rerankingApplied !== "boolean"
    || (value.retrieval.resultSource !== "reranked" && value.retrieval.resultSource !== "vector-search")
    || typeof value.retrieval.topK !== "number"
    || typeof value.retrieval.similarityThreshold !== "number") return false;
  const vectorFallbackValid = value.retrieval.fallback === undefined
    || (isRecord(value.retrieval.fallback)
      && value.retrieval.fallback.applied === true
      && typeof value.retrieval.fallback.reason === "string");
  const rerankingFallbackValid = value.retrieval.rerankingFallback === undefined
    || (isRecord(value.retrieval.rerankingFallback)
      && value.retrieval.rerankingFallback.applied === true
      && value.retrieval.rerankingFallback.from === "groq"
      && value.retrieval.rerankingFallback.to === "cohere"
      && typeof value.retrieval.rerankingFallback.reason === "string");
  return vectorFallbackValid && rerankingFallbackValid;
};

export const retrieveCompliance = async (body: ComplianceRetrievalRequest, signal?: AbortSignal) => {
  const result = await apiRequest<unknown, ComplianceRetrievalRequest>("/compliance/retrieve", {
    method: "POST",
    body,
    ...(signal ? { signal } : {}),
  });
  if (!isRetrievalData(result.data)) {
    throw new ApiClientError({
      code: "INVALID_RESPONSE",
      message: "The retrieval response did not match the expected contract",
      status: result.status,
      requestId: result.requestId,
    });
  }
  return { ...result, data: result.data };
};
