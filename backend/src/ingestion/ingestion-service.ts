import { env } from "../config/env.js";
import { ensureClauseIndexes } from "../database/indexes.js";
import type { LegalStandard, NormalizedClause } from "../domain/legal-clause.js";
import { embeddingService, type EmbeddingProvider } from "../embeddings/embedding-service.js";
import { AppError } from "../lib/app-error.js";
import { logger } from "../lib/logger.js";
import {
  clauseRepository,
  type ClauseRepository,
  type StoreClauseResult,
} from "../repositories/clause-repository.js";
import { readSnapshot } from "../scrapers/staging-store.js";

const embeddingText = (clause: NormalizedClause) =>
  `Regulation: ${clause.standard}\nClause: ${clause.clauseId}\nTitle: ${clause.title}\nLegal text:\n${clause.text}`;

const batchesOf = <T>(values: T[], size: number) => {
  const batches: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    batches.push(values.slice(index, index + size));
  }
  return batches;
};

export interface IngestionFailure {
  clauseId: string;
  code: string;
}

export interface IngestionSummary {
  standard: LegalStandard;
  total: number;
  created: number;
  updated: number;
  unchanged: number;
  failed: number;
  failures: IngestionFailure[];
  embeddingModel: string;
}

interface ClauseStore {
  storeVersion(input: Parameters<ClauseRepository["storeVersion"]>[0]): Promise<StoreClauseResult>;
}

export class IngestionService {
  constructor(
    private readonly embedder: EmbeddingProvider = embeddingService,
    private readonly repository: ClauseStore = clauseRepository,
    private readonly initializeIndexes: (standard: LegalStandard) => Promise<void> = ensureClauseIndexes,
    private readonly loadSnapshot = readSnapshot,
  ) {}

  async ingest(standard: LegalStandard, requestId: string): Promise<IngestionSummary> {
    const startedAt = performance.now();
    const snapshot = await this.loadSnapshot(standard);
    try {
      await this.initializeIndexes(standard);
    } catch {
      throw new AppError(503, "DATABASE_SETUP_FAILED", "Unable to prepare legal-clause storage");
    }

    const stored: StoreClauseResult[] = [];
    const failures: IngestionFailure[] = [];

    for (const batch of batchesOf(snapshot.clauses, env.INGEST_BATCH_SIZE)) {
      let embeddings: number[][];
      try {
        embeddings = await this.embedder.embedDocuments(batch.map(embeddingText));
      } catch (error) {
        const code = error instanceof AppError ? error.code : "EMBEDDING_UNAVAILABLE";
        failures.push(...batch.map((clause) => ({ clauseId: clause.clauseId, code })));
        continue;
      }

      for (const [index, clause] of batch.entries()) {
        const embedding = embeddings[index];
        if (!embedding) {
          failures.push({ clauseId: clause.clauseId, code: "EMBEDDING_MISSING" });
          continue;
        }
        try {
          stored.push(await this.repository.storeVersion({
            clause,
            embedding,
            embeddingModel: this.embedder.modelName,
          }));
        } catch {
          failures.push({ clauseId: clause.clauseId, code: "CLAUSE_PERSISTENCE_FAILED" });
        }
      }
    }

    if (stored.length === 0 && failures.length > 0) {
      throw new AppError(503, "INGESTION_FAILED", "No legal clauses could be ingested", {
        failed: failures.length,
      });
    }

    const summary: IngestionSummary = {
      standard,
      total: snapshot.clauses.length,
      created: stored.filter((item) => item.status === "created").length,
      updated: stored.filter((item) => item.status === "updated").length,
      unchanged: stored.filter((item) => item.status === "unchanged").length,
      failed: failures.length,
      failures,
      embeddingModel: this.embedder.modelName,
    };
    logger.info("legal_source_ingested", {
      requestId,
      operation: "ingest",
      standard,
      total: summary.total,
      created: summary.created,
      updated: summary.updated,
      unchanged: summary.unchanged,
      failed: summary.failed,
      embeddingModel: summary.embeddingModel,
      totalLatencyMs: Math.round((performance.now() - startedAt) * 100) / 100,
    });
    return summary;
  }
}

export const ingestionService = new IngestionService();
