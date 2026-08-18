import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { closeMongo } from "./database/mongo.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info("server_started", {
    environment: env.NODE_ENV,
    port: env.PORT,
    apiBasePath: "/api/v1",
  });
});
server.requestTimeout = env.REQUEST_TIMEOUT_MS;
server.headersTimeout = Math.min(env.REQUEST_TIMEOUT_MS, 60_000);

let shuttingDown = false;
const shutdown = (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info("server_shutdown_started", { signal });
  server.close(async (error) => {
    if (error) {
      logger.error("server_shutdown_failed", { signal, errorName: error.name });
      process.exitCode = 1;
    }
    try {
      await closeMongo();
    } catch (closeError) {
      logger.error("mongodb_shutdown_failed", {
        errorName: closeError instanceof Error ? closeError.name : "UnknownError",
      });
      process.exitCode = 1;
    }
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
