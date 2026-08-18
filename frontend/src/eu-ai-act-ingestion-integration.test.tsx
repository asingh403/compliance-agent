import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError, startEuAiActIngestion } from "./api";
import { App } from "./App";

vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api")>();
  return { ...actual, startEuAiActIngestion: vi.fn() };
});

const ingestionMock = vi.mocked(startEuAiActIngestion);

beforeEach(() => ingestionMock.mockReset());

describe("EU AI Act ingestion integration", () => {
  it("offers the existing backend snapshot when no scrape ran in this session", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Start EU AI Act Ingestion" }));
    expect(screen.getByRole("dialog", { name: "Start EU AI Act ingestion?" })).toBeInTheDocument();
    expect(screen.getByText(/Continue using the existing backend staging snapshot/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(ingestionMock).not.toHaveBeenCalled();
  });

  it("uses embedding progress and handles HTTP 207 as a partial ingestion", async () => {
    let resolveIngestion: ((value: Awaited<ReturnType<typeof startEuAiActIngestion>>) => void) | undefined;
    ingestionMock.mockReturnValue(new Promise((resolve) => { resolveIngestion = resolve; }));
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Start EU AI Act Ingestion" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("button", { name: "Ingesting..." })).toBeDisabled();
    expect(screen.getAllByText("Generating embeddings...").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Latest EU AI Act operation")).toBeInTheDocument();
    expect(ingestionMock).toHaveBeenCalledTimes(1);

    resolveIngestion?.({
      status: 207,
      requestId: "partial-eu-ingestion-request",
      data: {
        standard: "EU_AI_ACT",
        total: 113,
        created: 110,
        updated: 0,
        unchanged: 2,
        failed: 1,
        failures: [{ clauseId: "Article 6", code: "CLAUSE_PERSISTENCE_FAILED" }],
        embeddingModel: "mistral-embed",
      },
    });

    expect((await screen.findAllByText("Partial ingestion")).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("EU AI Act ingestion completed with warnings")).toBeInTheDocument();
    fireEvent.click(screen.getByText("View 1 failure detail"));
    expect(screen.getByText("Article 6")).toBeInTheDocument();
    expect(screen.getByText("CLAUSE_PERSISTENCE_FAILED")).toBeInTheDocument();
    expect(screen.getByText("mistral-embed · 1024D")).toBeInTheDocument();
    expect(screen.getByText("Indexed with warnings")).toBeInTheDocument();
  });

  it("maps an invalid staging snapshot and retries with confirmation", async () => {
    ingestionMock.mockRejectedValueOnce(new ApiClientError({
      code: "STAGING_SNAPSHOT_INVALID",
      message: "No valid staged snapshot",
      status: 422,
      requestId: "invalid-eu-staging-request",
    }));
    ingestionMock.mockResolvedValueOnce({
      status: 200,
      requestId: "successful-eu-retry",
      data: {
        standard: "EU_AI_ACT",
        total: 113,
        created: 113,
        updated: 0,
        unchanged: 0,
        failed: 0,
        failures: [],
        embeddingModel: "mistral-embed",
      },
    });
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Start EU AI Act Ingestion" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect((await screen.findAllByText("Ingestion cannot start")).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/Run the EU AI Act scrape first/).length).toBeGreaterThanOrEqual(2);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect((await screen.findAllByText("113 clauses processed")).length).toBeGreaterThanOrEqual(2);
    expect(ingestionMock).toHaveBeenCalledTimes(2);
  });
});
