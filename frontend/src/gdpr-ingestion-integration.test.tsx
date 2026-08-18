import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError, startGdprIngestion } from "./api";
import { App } from "./App";

vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api")>();
  return { ...actual, startGdprIngestion: vi.fn() };
});

const ingestionMock = vi.mocked(startGdprIngestion);

beforeEach(() => ingestionMock.mockReset());

describe("GDPR ingestion integration", () => {
  it("offers the existing backend snapshot when no scrape ran in this session", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Start GDPR Ingestion" }));
    expect(screen.getByRole("dialog", { name: "Start GDPR ingestion?" })).toBeInTheDocument();
    expect(screen.getByText(/Continue using the existing backend staging snapshot/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(ingestionMock).not.toHaveBeenCalled();
  });

  it("uses indeterminate loading and handles a 207 as completed with warnings", async () => {
    let resolveIngestion: ((value: Awaited<ReturnType<typeof startGdprIngestion>>) => void) | undefined;
    ingestionMock.mockReturnValue(new Promise((resolve) => { resolveIngestion = resolve; }));
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Start GDPR Ingestion" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("button", { name: "Ingesting..." })).toBeDisabled();
    expect(screen.getAllByText("Generating embeddings...").length).toBeGreaterThanOrEqual(1);
    expect(ingestionMock).toHaveBeenCalledTimes(1);

    resolveIngestion?.({
      status: 207,
      requestId: "partial-ingestion-request",
      data: {
        standard: "GDPR",
        total: 99,
        created: 0,
        updated: 2,
        unchanged: 96,
        failed: 1,
        failures: [{ clauseId: "Article 17", code: "CLAUSE_PERSISTENCE_FAILED" }],
        embeddingModel: "mistral-embed",
      },
    });

    expect((await screen.findAllByText("Partial ingestion")).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("GDPR ingestion completed with warnings")).toBeInTheDocument();
    fireEvent.click(screen.getByText("View 1 failure detail"));
    expect(screen.getByText("Article 17")).toBeInTheDocument();
    expect(screen.getByText("CLAUSE_PERSISTENCE_FAILED")).toBeInTheDocument();
    expect(screen.getByText("mistral-embed · 1024D")).toBeInTheDocument();
  });

  it("maps an invalid staging snapshot and retries with confirmation", async () => {
    ingestionMock.mockRejectedValueOnce(new ApiClientError({
      code: "STAGING_SNAPSHOT_INVALID",
      message: "No valid staged snapshot",
      status: 422,
      requestId: "invalid-staging-request",
    }));
    ingestionMock.mockResolvedValueOnce({
      status: 200,
      requestId: "successful-retry",
      data: {
        standard: "GDPR",
        total: 99,
        created: 99,
        updated: 0,
        unchanged: 0,
        failed: 0,
        failures: [],
        embeddingModel: "mistral-embed",
      },
    });
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Start GDPR Ingestion" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect((await screen.findAllByText("Ingestion cannot start")).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/Run the GDPR scrape first/).length).toBeGreaterThanOrEqual(2);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect((await screen.findAllByText("99 clauses processed")).length).toBeGreaterThanOrEqual(2);
    expect(ingestionMock).toHaveBeenCalledTimes(2);
  });
});
