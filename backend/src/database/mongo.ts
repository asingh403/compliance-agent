import { type Collection, type Db, MongoClient } from "mongodb";
import { env } from "../config/env.js";
import type { LegalClauseDocument, LegalStandard } from "../domain/legal-clause.js";
import type { ActivityDocument } from "../activity/activity-repository.js";
import { logger } from "../lib/logger.js";

let client: MongoClient | undefined;
let database: Db | undefined;
let connectionPromise: Promise<Db> | undefined;

const collectionName = (standard: LegalStandard) =>
  standard === "GDPR" ? env.MONGODB_COLLECTION_GDPR : env.MONGODB_COLLECTION_EU_AI;

export const connectMongo = async (): Promise<Db> => {
  if (database) return database;
  if (connectionPromise) return connectionPromise;

  const nextClient = new MongoClient(env.MONGODB_URI, {
    connectTimeoutMS: env.MONGODB_CONNECT_TIMEOUT_MS,
    serverSelectionTimeoutMS: env.MONGODB_CONNECT_TIMEOUT_MS,
    appName: "compliance-coverage-agent",
  });

  connectionPromise = (async () => {
    try {
      await nextClient.connect();
      const nextDatabase = nextClient.db(env.MONGODB_DB_NAME);
      client = nextClient;
      database = nextDatabase;
      logger.info("mongodb_connected", { database: env.MONGODB_DB_NAME });
      return nextDatabase;
    } catch (error) {
      await nextClient.close().catch(() => undefined);
      throw error;
    } finally {
      connectionPromise = undefined;
    }
  })();

  return connectionPromise;
};

export const getMongoDatabase = async () => database ?? connectMongo();

export const getClauseCollection = async (
  standard: LegalStandard,
): Promise<Collection<LegalClauseDocument>> => {
  const db = await getMongoDatabase();
  return db.collection<LegalClauseDocument>(collectionName(standard));
};

export const getActivityCollection = async (): Promise<Collection<ActivityDocument>> => {
  const db = await getMongoDatabase();
  return db.collection<ActivityDocument>(env.MONGODB_COLLECTION_ACTIVITY);
};

export const getMongoClient = () => {
  if (!client) throw new Error("MongoDB client has not been connected");
  return client;
};

export const checkMongoReadiness = async () => {
  const db = await getMongoDatabase();
  await db.command({ ping: 1 });
};

export const closeMongo = async () => {
  if (connectionPromise) {
    try {
      await connectionPromise;
    } catch {
      return;
    }
  }
  if (!client) return;
  const activeClient = client;
  client = undefined;
  database = undefined;
  await activeClient.close();
  logger.info("mongodb_disconnected");
};
