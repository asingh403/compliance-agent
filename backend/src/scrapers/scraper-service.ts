import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { env } from "../config/env.js";
import type { LegalStandard } from "../domain/legal-clause.js";
import { legalSourceSnapshotSchema, type LegalSourceSnapshot } from "../domain/legal-source.js";
import { AppError } from "../lib/app-error.js";
import { logger } from "../lib/logger.js";
import { parseEurLexArticles } from "./eur-lex-parser.js";
import { legalSourceRegistry } from "./source-registry.js";

export class ScraperService {
  async scrape(standard: LegalStandard, requestId: string): Promise<LegalSourceSnapshot> {
    const source = legalSourceRegistry[standard];
    const sourceUrl = new URL(source.sourceUrl);
    if (!env.legalSourceAllowedHosts.includes(sourceUrl.hostname)) {
      throw new AppError(500, "SCRAPE_SOURCE_NOT_ALLOWED", "Configured legal source is not allowed");
    }

    const startedAt = performance.now();
    try {
      const loader = new CheerioWebBaseLoader(source.sourceUrl, {
        timeout: env.SCRAPE_TIMEOUT_MS,
        headers: { "user-agent": "ComplianceCoverageAgent/0.1 (+legal-research)" },
      });
      const page = await loader.scrape();
      const scrapedAt = new Date();
      const clauses = parseEurLexArticles(page, standard, source.sourceUrl, scrapedAt);
      if (clauses.length < source.expectedMinimumClauses) {
        throw new AppError(
          502,
          "SCRAPE_STRUCTURE_INVALID",
          `Legal source returned ${clauses.length} clauses; expected at least ${source.expectedMinimumClauses}`,
        );
      }

      const snapshot = legalSourceSnapshotSchema.parse({
        standard,
        sourceUrl: source.sourceUrl,
        scrapedAt,
        clauses,
      });
      logger.info("legal_source_scraped", {
        requestId,
        operation: "scrape",
        standard,
        sourceHost: sourceUrl.hostname,
        clauseCount: clauses.length,
        totalLatencyMs: Math.round((performance.now() - startedAt) * 100) / 100,
      });
      return snapshot;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(502, "SCRAPE_SOURCE_UNAVAILABLE", "Unable to retrieve the legal source");
    }
  }
}

export const scraperService = new ScraperService();
