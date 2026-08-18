import type { Filter, ObjectId } from "mongodb";
import { env } from "../config/env.js";
import { getActivityCollection } from "../database/mongo.js";

export const activityActions = [
  "HEALTH_CHECK", "READINESS_CHECK", "GDPR_SCRAPE", "GDPR_INGESTION",
  "EU_AI_ACT_SCRAPE", "EU_AI_ACT_INGESTION", "COMPLIANCE_RETRIEVAL", "VOICE_TRANSCRIPTION",
] as const;
export type ActivityAction = typeof activityActions[number];
export type ActivityStatus = "SUCCESS" | "WARNING" | "FAILED";

export interface ActivityDocument {
  _id?: ObjectId;
  timestamp: Date;
  actor: { id: "local-user"; displayName: "Local user" };
  action: ActivityAction;
  status: ActivityStatus;
  requestId: string;
  durationMs: number;
  metadata: Record<string, string | number | boolean | string[] | null>;
}

let indexesReady: Promise<void> | undefined;
const collectionWithIndexes = async () => {
  const collection = await getActivityCollection();
  indexesReady ??= collection.createIndexes([
    { name: "idx_activity_timestamp", key: { timestamp: -1 } },
    { name: "idx_activity_status_action", key: { status: 1, action: 1, timestamp: -1 } },
    { name: "ttl_activity_retention", key: { timestamp: 1 }, expireAfterSeconds: env.ACTIVITY_RETENTION_DAYS * 86_400 },
  ]).then(() => undefined);
  await indexesReady;
  return collection;
};

export interface ActivityQuery {
  from: Date;
  to: Date;
  page: number;
  limit: number;
  status?: ActivityStatus;
  action?: ActivityAction;
  search?: string;
}

export class ActivityRepository {
  async record(entry: Omit<ActivityDocument, "timestamp" | "actor">) {
    const collection = await collectionWithIndexes();
    await collection.insertOne({
      ...entry,
      timestamp: new Date(),
      actor: { id: "local-user", displayName: "Local user" },
    });
  }

  async list(query: ActivityQuery) {
    const collection = await collectionWithIndexes();
    const baseFilter: Filter<ActivityDocument> = { timestamp: { $gte: query.from, $lte: query.to } };
    if (query.action) baseFilter.action = query.action;
    if (query.search) {
      const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      baseFilter.$or = [
        { requestId: { $regex: escaped, $options: "i" } },
        { "actor.displayName": { $regex: escaped, $options: "i" } },
      ];
    }
    const filter: Filter<ActivityDocument> = { ...baseFilter, ...(query.status ? { status: query.status } : {}) };
    const [documents, filteredTotal, total, success, warning, failed] = await Promise.all([
      collection.find(filter).sort({ timestamp: -1 }).skip((query.page - 1) * query.limit).limit(query.limit).toArray(),
      collection.countDocuments(filter),
      collection.countDocuments(baseFilter),
      collection.countDocuments({ ...baseFilter, status: "SUCCESS" }),
      collection.countDocuments({ ...baseFilter, status: "WARNING" }),
      collection.countDocuments({ ...baseFilter, status: "FAILED" }),
    ]);
    return {
      activities: documents.map(({ _id, ...document }) => ({ ...document, id: _id!.toHexString(), timestamp: document.timestamp.toISOString() })),
      summary: { total, success, warning, failed },
      pagination: { page: query.page, limit: query.limit, total: filteredTotal, pages: Math.max(1, Math.ceil(filteredTotal / query.limit)) },
      range: { from: query.from.toISOString(), to: query.to.toISOString() },
    };
  }
}

export const activityRepository = new ActivityRepository();
