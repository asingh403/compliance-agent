import { Router } from "express";
import { AppError } from "../lib/app-error.js";
import { complianceRetrievalRequestSchema } from "../retrieval/retrieval-contract.js";
import { retrievalService } from "../retrieval/retrieval-service.js";
import { aiOperationRateLimiter } from "../middleware/security.js";

export const complianceRouter = Router();

complianceRouter.post("/retrieve", aiOperationRateLimiter, async (request, response) => {
  const parsed = complianceRetrievalRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new AppError(422, "INVALID_REQUEST", "Compliance retrieval request is invalid", {
      fields: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  const data = await retrievalService.retrieve(parsed.data, request.requestId);
  response.locals.activityWarning = Boolean(data.retrieval.fallback?.applied || data.retrieval.rerankingFallback?.applied);
  response.locals.activityMetadata = {
    standards: parsed.data.standards,
    resultCount: data.results.length,
    resultSource: data.retrieval.resultSource,
    rerankingProvider: data.retrieval.rerankingProvider,
    fallback: data.retrieval.rerankingFallback?.applied ? "GROQ_TO_COHERE" : data.retrieval.fallback?.applied ? "VECTOR_ONLY" : null,
  };
  response.json({ success: true, data, meta: { requestId: request.requestId } });
});
