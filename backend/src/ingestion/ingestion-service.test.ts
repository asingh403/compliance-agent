import { describe, expect, it, vi } from "vitest";
import type { LegalSourceSnapshot } from "../domain/legal-source.js";
import { IngestionService } from "./ingestion-service.js";

const snapshot: LegalSourceSnapshot = {
  standard: "GDPR",
  sourceUrl: "https://eur-lex.europa.eu/gdpr",
  scrapedAt: new Date(),
  clauses: [
    {
      standard: "GDPR",
      clauseId: "Article 1",
      title: "Subject matter",
      text: "Legal text",
      sourceUrl: "https://eur-lex.europa.eu/gdpr#art_1",
      contentHash: `sha256:${"a".repeat(64)}`,
      sourceRetrievedAt: new Date(),
    },
    {
      standard: "GDPR",
      clauseId: "Article 2",
      title: "Scope",
      text: "More legal text",
      sourceUrl: "https://eur-lex.europa.eu/gdpr#art_2",
      contentHash: `sha256:${"b".repeat(64)}`,
      sourceRetrievedAt: new Date(),
    },
  ],
};

describe("IngestionService", () => {
  it("embeds and stores every staged clause with a summary", async () => {
    const embedder = {
      modelName: "mistral-embed",
      embedDocuments: vi.fn().mockResolvedValue(snapshot.clauses.map(() => Array(1024).fill(0.1))),
      embedQuery: vi.fn(),
    };
    const repository = {
      storeVersion: vi.fn()
        .mockResolvedValueOnce({ standard: "GDPR", clauseId: "Article 1", status: "created", version: 1 })
        .mockResolvedValueOnce({ standard: "GDPR", clauseId: "Article 2", status: "unchanged", version: 1 }),
    };
    const service = new IngestionService(
      embedder,
      repository,
      vi.fn().mockResolvedValue(undefined),
      vi.fn().mockResolvedValue(snapshot),
    );

    await expect(service.ingest("GDPR", "request-1")).resolves.toMatchObject({
      total: 2,
      created: 1,
      unchanged: 1,
      updated: 0,
      failed: 0,
      embeddingModel: "mistral-embed",
    });
    expect(repository.storeVersion).toHaveBeenCalledTimes(2);
  });
});
