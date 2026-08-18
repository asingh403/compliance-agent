import { Router } from "express";
import { healthRouter } from "./health.js";
import { legalSourcesRouter } from "./legal-sources.js";
import { complianceRouter } from "./compliance.js";
import { speechRouter } from "./speech.js";
import { activityRouter } from "./activity.js";

export const apiV1Router = Router();

apiV1Router.use("/health", healthRouter);
apiV1Router.use("/legal-sources", legalSourcesRouter);
apiV1Router.use("/compliance", complianceRouter);
apiV1Router.use("/speech", speechRouter);
apiV1Router.use("/activity", activityRouter);
