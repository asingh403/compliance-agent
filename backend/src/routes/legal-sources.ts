import { Router } from "express";
import { z } from "zod";
import type { LegalStandard } from "../domain/legal-clause.js";
import { AppError } from "../lib/app-error.js";
import { scraperService } from "../scrapers/scraper-service.js";
import { writeSnapshot } from "../scrapers/staging-store.js";
import { ingestionService } from "../ingestion/ingestion-service.js";
import { aiOperationRateLimiter } from "../middleware/security.js";

const routeStandardSchema = z.enum(["gdpr", "eu-ai-act"]);
const standardByRoute: Record<z.infer<typeof routeStandardSchema>, LegalStandard> = {
  gdpr: "GDPR",
  "eu-ai-act": "EU_AI_ACT",
};

export const legalSourcesRouter = Router();

legalSourcesRouter.post("/:standard/scrapes", aiOperationRateLimiter, async (request, response) => {
  const parsed = routeStandardSchema.safeParse(request.params.standard);
  if (!parsed.success) {
    throw new AppError(400, "INVALID_STANDARD", "Standard must be gdpr or eu-ai-act");
  }

  const standard = standardByRoute[parsed.data];
  const snapshot = await scraperService.scrape(standard, request.requestId);
  const staging = await writeSnapshot(snapshot);
  response.locals.activityMetadata = { standard, clauseCount: snapshot.clauses.length };
  response.status(201).json({
    success: true,
    data: {
      standard,
      sourceUrl: snapshot.sourceUrl,
      scrapedAt: snapshot.scrapedAt.toISOString(),
      clauseCount: snapshot.clauses.length,
      stagingArtifact: staging.fileName,
    },
    meta: { requestId: request.requestId },
  });
});

legalSourcesRouter.post("/:standard/ingestions", aiOperationRateLimiter, async (request, response) => {
  const parsed = routeStandardSchema.safeParse(request.params.standard);
  if (!parsed.success) {
    throw new AppError(400, "INVALID_STANDARD", "Standard must be gdpr or eu-ai-act");
  }

  const standard = standardByRoute[parsed.data];
  const summary = await ingestionService.ingest(standard, request.requestId);
  response.locals.activityWarning = summary.failed > 0;
  response.locals.activityMetadata = {
    standard,
    total: summary.total,
    created: summary.created,
    updated: summary.updated,
    failed: summary.failed,
  };
  response.status(summary.failed > 0 ? 207 : 200).json({
    success: true,
    data: summary,
    meta: { requestId: request.requestId },
  });
});
