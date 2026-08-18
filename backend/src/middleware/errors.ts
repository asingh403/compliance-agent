import type { ErrorRequestHandler, RequestHandler } from "express";
import { AppError } from "../lib/app-error.js";
import { logger } from "../lib/logger.js";

export const notFound: RequestHandler = (request, _response, next) => {
  next(new AppError(404, "ROUTE_NOT_FOUND", `Route ${request.method} ${request.path} was not found`));
};

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  const malformedJson = error instanceof SyntaxError
    && "status" in error
    && error.status === 400;
  const payloadTooLarge = error instanceof Error
    && "status" in error
    && error.status === 413;
  const appError = error instanceof AppError
    ? error
    : malformedJson
      ? new AppError(400, "INVALID_JSON", "Request body contains malformed JSON")
      : payloadTooLarge
        ? new AppError(413, "PAYLOAD_TOO_LARGE", "Request body exceeds the allowed size")
      : new AppError(500, "INTERNAL_ERROR", "An unexpected error occurred");

  logger.error("http_request_failed", {
    requestId: request.requestId,
    method: request.method,
    path: request.originalUrl,
    statusCode: appError.statusCode,
    errorCode: appError.code,
    errorName: error instanceof Error ? error.name : "UnknownError",
  });
  response.locals.activityErrorCode = appError.code;

  response.status(appError.statusCode).json({
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      requestId: request.requestId,
      ...(appError.details === undefined ? {} : { details: appError.details }),
    },
  });
};
