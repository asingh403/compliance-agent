import { z } from "zod";
import { legalStandardSchema, normalizedClauseSchema } from "./legal-clause.js";

export const legalSourceSnapshotSchema = z.object({
  standard: legalStandardSchema,
  sourceUrl: z.string().url(),
  scrapedAt: z.date(),
  clauses: z.array(normalizedClauseSchema).min(1),
});

export type LegalSourceSnapshot = z.infer<typeof legalSourceSnapshotSchema>;

export interface StagedLegalSourceSnapshot {
  standard: z.infer<typeof legalStandardSchema>;
  sourceUrl: string;
  scrapedAt: string;
  clauses: Array<{
    standard: z.infer<typeof legalStandardSchema>;
    clauseId: string;
    title: string;
    text: string;
    sourceUrl: string;
    contentHash: string;
    sourceRetrievedAt: string;
  }>;
}
