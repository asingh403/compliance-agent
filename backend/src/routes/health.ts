import { Router } from "express";
import { env } from "../config/env.js";
import { checkMongoReadiness } from "../database/mongo.js";
import { AppError } from "../lib/app-error.js";

export const healthRouter = Router();

healthRouter.get("/", (request, response) => {
  response.json({
    success: true,
    data: {
      status: "ok",
      service: "compliance-coverage-agent-backend",
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    },
    meta: { requestId: request.requestId },
  });
});

healthRouter.get("/ready", async (request, response) => {
  try {
    await checkMongoReadiness();
  } catch {
    throw new AppError(503, "DEPENDENCY_UNAVAILABLE", "MongoDB readiness check failed");
  }
  response.json({
    success: true,
    data: {
      status: "ready",
      dependencies: { mongodb: "available" },
      timestamp: new Date().toISOString(),
    },
    meta: { requestId: request.requestId },
  });
});
