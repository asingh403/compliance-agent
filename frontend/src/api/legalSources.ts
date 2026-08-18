import { apiRequest } from "./client";
import type { LegalSourceIngestionData, LegalSourceScrapeData } from "./types";

export const startGdprScrape = (signal?: AbortSignal) =>
  apiRequest<LegalSourceScrapeData>("/legal-sources/gdpr/scrapes", {
    method: "POST",
    ...(signal ? { signal } : {}),
  });

export const startEuAiActScrape = (signal?: AbortSignal) =>
  apiRequest<LegalSourceScrapeData>("/legal-sources/eu-ai-act/scrapes", {
    method: "POST",
    ...(signal ? { signal } : {}),
  });

export const startGdprIngestion = (signal?: AbortSignal) =>
  apiRequest<LegalSourceIngestionData>("/legal-sources/gdpr/ingestions", {
    method: "POST",
    ...(signal ? { signal } : {}),
  });

export const startEuAiActIngestion = (signal?: AbortSignal) =>
  apiRequest<LegalSourceIngestionData>("/legal-sources/eu-ai-act/ingestions", {
    method: "POST",
    ...(signal ? { signal } : {}),
  });
