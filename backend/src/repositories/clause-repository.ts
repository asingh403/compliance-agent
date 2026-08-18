import type { ClientSession, Filter } from "mongodb";
import type {
  LegalClauseDocument,
  LegalStandard,
  NormalizedClause,
  RetrievalCandidate,
} from "../domain/legal-clause.js";
import { env } from "../config/env.js";
import { AppError } from "../lib/app-error.js";
import { getClauseCollection, getMongoClient } from "../database/mongo.js";

export type VersionDecision =
  | { action: "unchanged"; version: number }
  | { action: "create"; version: number };

export const decideClauseVersion = (
  existing: Pick<LegalClauseDocument, "contentHash" | "version"> | null,
  incomingContentHash: string,
): VersionDecision => {
  if (!existing) return { action: "create", version: 1 };
  if (existing.contentHash === incomingContentHash) {
    return { action: "unchanged", version: existing.version };
  }
  return { action: "create", version: existing.version + 1 };
};

export interface StoreClauseInput {
  clause: NormalizedClause;
  embedding: number[];
  embeddingModel: string;
}

export interface StoreClauseResult {
  standard: LegalStandard;
  clauseId: string;
  status: "created" | "updated" | "unchanged";
  version: number;
}

export class ClauseRepository {
  async findActive(standard: LegalStandard, clauseId: string) {
    const collection = await getClauseCollection(standard);
    return collection.findOne({ standard, clauseId, isActive: true });
  }

  async storeVersion(input: StoreClauseInput): Promise<StoreClauseResult> {
    const { clause } = input;
    const collection = await getClauseCollection(clause.standard);
    const client = getMongoClient();
    const session = client.startSession();
    let result: StoreClauseResult | undefined;

    try {
      await session.withTransaction(async () => {
        const filter: Filter<LegalClauseDocument> = {
          standard: clause.standard,
          clauseId: clause.clauseId,
          isActive: true,
        };
        const existing = await collection.findOne(filter, { session });
        const decision = decideClauseVersion(existing, clause.contentHash);

        if (decision.action === "unchanged") {
          result = {
            standard: clause.standard,
            clauseId: clause.clauseId,
            status: "unchanged",
            version: decision.version,
          };
          return;
        }

        const now = new Date();
        if (existing) {
          await collection.updateOne(filter, { $set: { isActive: false, updatedAt: now } }, { session });
        }

        const document: LegalClauseDocument = {
          ...clause,
          version: decision.version,
          isActive: true,
          embedding: input.embedding,
          embeddingModel: input.embeddingModel,
          metadata: { standard: clause.standard, clauseId: clause.clauseId },
          createdAt: now,
          updatedAt: now,
        };
        await collection.insertOne(document, { session });
        result = {
          standard: clause.standard,
          clauseId: clause.clauseId,
          status: existing ? "updated" : "created",
          version: decision.version,
        };
      });
    } finally {
      await session.endSession();
    }

    if (!result) throw new Error("Clause version transaction completed without a result");
    return result;
  }

  async findSimilar(
    standard: LegalStandard,
    queryVector: number[],
    topK: number,
    similarityThreshold: number,
  ): Promise<RetrievalCandidate[]> {
    const collection = await getClauseCollection(standard);
    const index = standard === "GDPR"
      ? env.MONGODB_VECTOR_INDEX_GDPR
      : env.MONGODB_VECTOR_INDEX_EU_AI;

    try {
      return await collection.aggregate<RetrievalCandidate>([
        {
          $vectorSearch: {
            index,
            path: "embedding",
            queryVector,
            numCandidates: Math.max(env.VECTOR_NUM_CANDIDATES, topK),
            limit: topK,
            filter: {
              "metadata.standard": standard,
              isActive: true,
            },
          },
        },
        {
          $project: {
            _id: 0,
            standard: 1,
            clauseId: 1,
            title: 1,
            text: 1,
            sourceUrl: 1,
            version: 1,
            vectorScore: { $meta: "vectorSearchScore" },
          },
        },
        { $match: { vectorScore: { $gte: similarityThreshold } } },
        { $sort: { vectorScore: -1 } },
      ]).toArray();
    } catch {
      throw new AppError(503, "VECTOR_SEARCH_FAILED", "Unable to retrieve compliance clauses");
    }
  }
}

export const clauseRepository = new ClauseRepository();
