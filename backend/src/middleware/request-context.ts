import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { logger } from "../lib/logger.js";

const acceptedRequestId = /^[A-Za-z0-9._:-]{1,128}$/;

export const requestContext = (request: Request, response: Response, next: NextFunction) => {
  const provided = request.header("x-request-id");
  request.requestId = provided && acceptedRequestId.test(provided) ? provided : randomUUID();
  response.setHeader("x-request-id", request.requestId);

  const startedAt = performance.now();
  response.on("finish", () => {
    logger.info("http_request_completed", {
      requestId: request.requestId,
      method: request.method,
      path: request.originalUrl,
      statusCode: response.statusCode,
      totalLatencyMs: Math.round((performance.now() - startedAt) * 100) / 100,
    });
  });

  next();
};
