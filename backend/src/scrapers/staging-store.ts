import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { env } from "../config/env.js";
import type { LegalStandard } from "../domain/legal-clause.js";
import type { LegalSourceSnapshot, StagedLegalSourceSnapshot } from "../domain/legal-source.js";
import { legalSourceSnapshotSchema } from "../domain/legal-source.js";
import { AppError } from "../lib/app-error.js";

const dataDirectory = resolve(process.cwd(), env.SCRAPE_DATA_DIR);
const fileName = (standard: LegalStandard) =>
  standard === "GDPR" ? "gdpr.normalized.json" : "eu-ai-act.normalized.json";

export const stagingPath = (standard: LegalStandard) => resolve(dataDirectory, fileName(standard));

export const writeSnapshot = async (snapshot: LegalSourceSnapshot) => {
  await mkdir(dataDirectory, { recursive: true });
  const target = stagingPath(snapshot.standard);
  const temporary = `${target}.${process.pid}.tmp`;
  const serialized: StagedLegalSourceSnapshot = JSON.parse(JSON.stringify(snapshot));
  await writeFile(temporary, `${JSON.stringify(serialized, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, target);
  return { fileName: fileName(snapshot.standard), clauseCount: snapshot.clauses.length };
};

export const readSnapshot = async (standard: LegalStandard): Promise<LegalSourceSnapshot> => {
  try {
    const raw = await readFile(stagingPath(standard), "utf8");
    const value = JSON.parse(raw) as StagedLegalSourceSnapshot;
    return legalSourceSnapshotSchema.parse({
      ...value,
      scrapedAt: new Date(value.scrapedAt),
      clauses: value.clauses.map((clause) => ({
        ...clause,
        sourceRetrievedAt: new Date(clause.sourceRetrievedAt),
      })),
    });
  } catch (error) {
    throw new AppError(
      422,
      "STAGING_SNAPSHOT_INVALID",
      `No valid staged snapshot is available for ${standard}`,
    );
  }
};
