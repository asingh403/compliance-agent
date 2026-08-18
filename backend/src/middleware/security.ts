import type { Request, Response } from "express";
import { rateLimit } from "express-rate-limit";
import { env } from "../config/env.js";

const rateLimitHandler = (request: Request, response: Response) => {
  response.status(429).json({
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests; try again later",
      requestId: request.requestId,
    },
  });
};

const common = {
  windowMs: env.API_RATE_LIMIT_WINDOW_MS,
  standardHeaders: "draft-8" as const,
  legacyHeaders: false,
  handler: rateLimitHandler,
};

export const apiRateLimiter = rateLimit({ ...common, limit: env.API_RATE_LIMIT_MAX });
export const aiOperationRateLimiter = rateLimit({ ...common, limit: env.AI_RATE_LIMIT_MAX });
