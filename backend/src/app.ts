import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { AppError } from "./lib/app-error.js";
import { errorHandler, notFound } from "./middleware/errors.js";
import { requestContext } from "./middleware/request-context.js";
import { apiV1Router } from "./routes/index.js";
import { apiRateLimiter } from "./middleware/security.js";
import { activityAudit } from "./middleware/activity-audit.js";

export const createApp = () => {
  const app = express();
  app.disable("x-powered-by");
  if (env.TRUST_PROXY_HOPS > 0) app.set("trust proxy", env.TRUST_PROXY_HOPS);
  app.use(requestContext);
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || env.corsAllowedOrigins.includes(origin)) return callback(null, true);
      return callback(new AppError(403, "CORS_ORIGIN_DENIED", "Origin is not allowed"));
    },
  }));
  app.use(express.json({ limit: env.REQUEST_BODY_LIMIT }));
  app.use(activityAudit);
  app.use("/api/v1", apiRateLimiter, apiV1Router);
  app.use(notFound);
  app.use(errorHandler);
  return app;
};
