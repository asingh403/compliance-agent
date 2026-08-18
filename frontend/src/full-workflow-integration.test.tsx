import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getHealth,
  getReadiness,
  retrieveCompliance,
  startEuAiActIngestion,
  startEuAiActScrape,
  startGdprIngestion,
  startGdprScrape,
} from "./api";
import { App } from "./App";
import { TRUST_USAGE_STORAGE_KEY } from "./hooks/useTrustUsage";

vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api")>();
  return {
    ...actual,
    getHealth: vi.fn(),
    getReadiness: vi.fn(),
    startGdprScrape: vi.fn(),
    startGdprIngestion: vi.fn(),
    startEuAiActScrape: vi.fn(),
    startEuAiActIngestion: vi.fn(),
    retrieveCompliance: vi.fn(),
  };
});

const mocks = {
  health: vi.mocked(getHealth),
  readiness: vi.mocked(getReadiness),
  gdprScrape: vi.mocked(startGdprScrape),
  gdprIngestion: vi.mocked(startGdprIngestion),
  euScrape: vi.mocked(startEuAiActScrape),
  euIngestion: vi.mocked(startEuAiActIngestion),
  retrieval: vi.mocked(retrieveCompliance),
};

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
  localStorage.setItem(TRUST_USAGE_STORAGE_KEY, "accepted");
  mocks.health.mockResolvedValue({
    status: 200,
    requestId: "sequence-health",
    data: { status: "ok", service: "compliance-coverage-agent-backend", environment: "test", timestamp: "2026-08-18T01:00:00.000Z" },
  });
  mocks.readiness.mockResolvedValue({
    status: 200,
    requestId: "sequence-readiness",
    data: { status: "ready", dependencies: { mongodb: "available" }, timestamp: "2026-08-18T01:01:00.000Z" },
  });
  mocks.gdprScrape.mockResolvedValue({
    status: 201,
    requestId: "sequence-gdpr-scrape",
    data: {
      standard: "GDPR",
      sourceUrl: "https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng",
      scrapedAt: "2026-08-18T01:02:00.000Z",
      clauseCount: 99,
      stagingArtifact: "gdpr.normalized.json",
    },
  });
  mocks.gdprIngestion.mockResolvedValue({
    status: 200,
    requestId: "sequence-gdpr-ingestion",
    data: { standard: "GDPR", total: 99, created: 99, updated: 0, unchanged: 0, failed: 0, failures: [], embeddingModel: "mistral-embed" },
  });
  mocks.euScrape.mockResolvedValue({
    status: 201,
    requestId: "sequence-eu-scrape",
    data: {
      standard: "EU_AI_ACT",
      sourceUrl: "https://eur-lex.europa.eu/eli/reg/2024/1689/oj/eng",
      scrapedAt: "2026-08-18T01:04:00.000Z",
      clauseCount: 113,
      stagingArtifact: "eu-ai-act.normalized.json",
    },
  });
  mocks.euIngestion.mockResolvedValue({
    status: 200,
    requestId: "sequence-eu-ingestion",
    data: { standard: "EU_AI_ACT", total: 113, created: 113, updated: 0, unchanged: 0, failed: 0, failures: [], embeddingModel: "mistral-embed" },
  });
  mocks.retrieval.mockResolvedValue({
    status: 200,
    requestId: "sequence-retrieval",
    data: {
      results: [{
        standard: "GDPR",
        clauseId: "Article 17",
        title: "Right to erasure",
        excerpt: "The data subject shall have the right to obtain erasure.",
        sourceUrl: "https://eur-lex.europa.eu/eli/reg/2016/679/art_17/oj",
        vectorScore: 0.86,
        rerankingScore: 0.94,
        finalScore: 0.912,
        explanation: "Directly addresses deletion requests.",
        evidence: [],
      }],
      coverage: {
        score: 78,
        type: "indicative-retrieval-coverage",
        disclaimer: "This score indicates retrieved evidence coverage and is not a legal compliance determination.",
      },
      retrieval: {
        embeddingModel: "mistral-embed",
        rerankingModel: "llama",
        rerankingProvider: "groq",
        rerankingApplied: true,
        resultSource: "reranked",
        topK: 10,
        similarityThreshold: 0.65,
      },
    },
  });
});

describe("complete compliance workflow", () => {
  it("preserves state through all seven operations and a light-to-dim theme change", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Run Health Check" }));
    expect(await screen.findByRole("article", { name: "Health: Completed" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Check Readiness" }));
    expect(await screen.findByRole("article", { name: "Readiness: Completed" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Switch to dim theme" }));
    expect(document.documentElement.dataset.theme).toBe("dim");
    expect(screen.getByRole("article", { name: "Health: Completed" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Readiness: Completed" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Start GDPR Scrape" }));
    fireEvent.click(screen.getByRole("button", { name: "Start Scrape" }));
    expect(await screen.findByRole("article", { name: "GDPR Scrape: Completed" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Start GDPR Ingestion" }));
    fireEvent.click(screen.getByRole("button", { name: "Start Ingestion" }));
    expect(await screen.findByRole("article", { name: "GDPR Ingestion: Completed" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Start EU AI Act Scrape" }));
    fireEvent.click(screen.getByRole("button", { name: "Start Scrape" }));
    expect(await screen.findByRole("article", { name: "EU AI Act Scrape: Completed" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Start EU AI Act Ingestion" }));
    fireEvent.click(screen.getByRole("button", { name: "Start Ingestion" }));
    expect(await screen.findByRole("article", { name: "EU AI Act Ingestion: Completed" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open Retrieval" }));
    fireEvent.change(screen.getByLabelText("Requirement"), { target: { value: "Users can request erasure of personal data." } });
    fireEvent.click(screen.getByRole("button", { name: "Retrieve Evidence" }));
    expect(await screen.findByRole("article", { name: "Compliance Retrieval: Completed" })).toBeInTheDocument();
    expect(screen.getByText("Article 17")).toBeInTheDocument();

    expect(screen.getByText("7 of 7 steps completed")).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe("dim");
    await waitFor(() => Object.values(mocks).forEach((mock) => expect(mock).toHaveBeenCalledTimes(1)));
  });
});
