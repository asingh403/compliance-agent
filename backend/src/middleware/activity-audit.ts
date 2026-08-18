import type { RequestHandler } from "express";
import type { ActivityAction, ActivityStatus } from "../activity/activity-repository.js";
import { activityRepository } from "../activity/activity-repository.js";
import { logger } from "../lib/logger.js";
import { env } from "../config/env.js";

export const actionFor = (method: string, path: string): ActivityAction | null => {
  if (method === "GET" && path === "/api/v1/health") return "HEALTH_CHECK";
  if (method === "GET" && path === "/api/v1/health/ready") return "READINESS_CHECK";
  if (method === "POST" && path === "/api/v1/legal-sources/gdpr/scrapes") return "GDPR_SCRAPE";
  if (method === "POST" && path === "/api/v1/legal-sources/gdpr/ingestions") return "GDPR_INGESTION";
  if (method === "POST" && path === "/api/v1/legal-sources/eu-ai-act/scrapes") return "EU_AI_ACT_SCRAPE";
  if (method === "POST" && path === "/api/v1/legal-sources/eu-ai-act/ingestions") return "EU_AI_ACT_INGESTION";
  if (method === "POST" && path === "/api/v1/compliance/retrieve") return "COMPLIANCE_RETRIEVAL";
  if (method === "POST" && path === "/api/v1/speech/transcriptions") return "VOICE_TRANSCRIPTION";
  return null;
};

export const activityAudit: RequestHandler = (request, response, next) => {
  if (env.NODE_ENV === "test") return next();
  const action = actionFor(request.method, request.path);
  if (!action) return next();
  const startedAt = performance.now();
  response.on("finish", () => {
    const status: ActivityStatus = response.statusCode >= 400
      ? "FAILED"
      : response.locals.activityWarning ? "WARNING" : "SUCCESS";
    const metadata = {
      ...(response.locals.activityMetadata as Record<string, string | number | boolean | string[] | null> | undefined),
      ...(response.locals.activityErrorCode ? { errorCode: String(response.locals.activityErrorCode) } : {}),
    };
    void activityRepository.record({
      action,
      status,
      requestId: request.requestId,
      durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
      metadata,
    }).catch((error: unknown) => logger.error("activity_audit_write_failed", {
      requestId: request.requestId,
      action,
      errorName: error instanceof Error ? error.name : "UnknownError",
    }));
  });
  next();
};
