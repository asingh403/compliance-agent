import type { Document } from "mongodb";
import { env } from "../config/env.js";
import type { LegalStandard } from "../domain/legal-clause.js";
import { getClauseCollection } from "./mongo.js";

export const buildVectorSearchDefinition = (): Document => ({
  fields: [
    {
      type: "vector",
      path: "embedding",
      numDimensions: env.MONGODB_VECTOR_DIMENSIONS,
      similarity: "cosine",
    },
    { type: "filter", path: "metadata.standard" },
    { type: "filter", path: "metadata.clauseId" },
    { type: "filter", path: "isActive" },
  ],
});

export const vectorSearchDefinitionNeedsUpdate = (index: Document) => {
  const fields = index.latestDefinition?.fields;
  if (!Array.isArray(fields)) return true;
  const hasField = (type: string, path: string) => fields.some((field: Document) =>
    field.type === type && field.path === path);
  const vector = fields.find((field: Document) => field.type === "vector" && field.path === "embedding");
  return !vector
    || vector.numDimensions !== env.MONGODB_VECTOR_DIMENSIONS
    || vector.similarity !== "cosine"
    || !hasField("filter", "metadata.standard")
    || !hasField("filter", "metadata.clauseId")
    || !hasField("filter", "isActive");
};

const vectorIndexName = (standard: LegalStandard) =>
  standard === "GDPR" ? env.MONGODB_VECTOR_INDEX_GDPR : env.MONGODB_VECTOR_INDEX_EU_AI;

export const ensureClauseIndexes = async (standard: LegalStandard) => {
  const collection = await getClauseCollection(standard);
  await collection.createIndexes([
    {
      name: "uq_standard_clause_version",
      key: { standard: 1, clauseId: 1, version: 1 },
      unique: true,
    },
    {
      name: "idx_standard_active_clause",
      key: { standard: 1, isActive: 1, clauseId: 1 },
    },
    {
      name: "idx_source_url",
      key: { sourceUrl: 1 },
    },
  ]);

  const name = vectorIndexName(standard);
  const existing = await collection.listSearchIndexes(name).toArray();
  const current = existing[0];
  const definition = buildVectorSearchDefinition();
  if (!current) {
    await collection.createSearchIndex({
      name,
      type: "vectorSearch",
      definition,
    });
  } else if (vectorSearchDefinitionNeedsUpdate(current)) {
    await collection.updateSearchIndex(name, definition);
  }
};

export const ensureAllDatabaseIndexes = async () => {
  await Promise.all([ensureClauseIndexes("GDPR"), ensureClauseIndexes("EU_AI_ACT")]);
};
