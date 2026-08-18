import { describe, expect, it } from "vitest";
import { buildVectorSearchDefinition, vectorSearchDefinitionNeedsUpdate } from "./indexes.js";

describe("Atlas vector index definition", () => {
  it("uses the compatible embedding path, dimension, cosine similarity, and filters", () => {
    expect(buildVectorSearchDefinition()).toEqual({
      fields: [
        { type: "vector", path: "embedding", numDimensions: 1024, similarity: "cosine" },
        { type: "filter", path: "metadata.standard" },
        { type: "filter", path: "metadata.clauseId" },
        { type: "filter", path: "isActive" },
      ],
    });
  });

  it("detects an existing vector index that is missing the active-clause filter", () => {
    expect(vectorSearchDefinitionNeedsUpdate({
      latestDefinition: {
        fields: [
          { type: "vector", path: "embedding", numDimensions: 1024, similarity: "cosine" },
          { type: "filter", path: "metadata.standard" },
          { type: "filter", path: "metadata.clauseId" },
        ],
      },
    })).toBe(true);
  });

  it("leaves a compatible existing vector index unchanged", () => {
    expect(vectorSearchDefinitionNeedsUpdate({ latestDefinition: buildVectorSearchDefinition() })).toBe(false);
  });
});
