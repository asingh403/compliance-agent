import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError, startEuAiActScrape } from "./api";
import { App } from "./App";

vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api")>();
  return { ...actual, startEuAiActScrape: vi.fn() };
});

const scrapeMock = vi.mocked(startEuAiActScrape);

beforeEach(() => scrapeMock.mockReset());

describe("EU AI Act scrape integration", () => {
  it("requires confirmation and supports cancellation", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Start EU AI Act Scrape" }));
    expect(screen.getByRole("dialog", { name: "Refresh EU AI Act legal source?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(scrapeMock).not.toHaveBeenCalled();
  });

  it("shows loading and renders the staged scrape result", async () => {
    let resolveScrape: ((value: Awaited<ReturnType<typeof startEuAiActScrape>>) => void) | undefined;
    scrapeMock.mockReturnValue(new Promise((resolve) => { resolveScrape = resolve; }));
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Start EU AI Act Scrape" }));
    fireEvent.click(screen.getByRole("button", { name: "Start Scrape" }));
    expect(screen.getByRole("button", { name: "Scraping..." })).toBeDisabled();
    expect(scrapeMock).toHaveBeenCalledTimes(1);

    resolveScrape?.({
      status: 201,
      requestId: "eu-ai-act-scrape-request",
      data: {
        standard: "EU_AI_ACT",
        sourceUrl: "https://eur-lex.europa.eu/eli/reg/2024/1689/oj/eng",
        scrapedAt: "2026-08-18T00:20:00.000Z",
        clauseCount: 113,
        stagingArtifact: "eu-ai-act.normalized.json",
      },
    });

    expect(await screen.findByText("113 clauses retrieved")).toBeInTheDocument();
    expect(screen.getAllByText("113").length).toBeGreaterThanOrEqual(1);
    fireEvent.click(screen.getByText("Details"));
    expect(screen.getByText("eu-ai-act-scrape-request")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View EUR-Lex" })).toHaveAttribute(
      "href",
      "https://eur-lex.europa.eu/eli/reg/2024/1689/oj/eng",
    );
  });

  it("maps source failures and allows a confirmed retry", async () => {
    scrapeMock.mockRejectedValueOnce(new ApiClientError({
      code: "SCRAPE_STRUCTURE_INVALID",
      message: "Source shape changed",
      status: 502,
      requestId: "failed-eu-scrape-request",
    }));
    scrapeMock.mockResolvedValueOnce({
      status: 201,
      requestId: "retry-eu-request",
      data: {
        standard: "EU_AI_ACT",
        sourceUrl: "https://eur-lex.europa.eu/eli/reg/2024/1689/oj/eng",
        scrapedAt: "2026-08-18T00:21:00.000Z",
        clauseCount: 113,
        stagingArtifact: "eu-ai-act.normalized.json",
      },
    });
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Start EU AI Act Scrape" }));
    fireEvent.click(screen.getByRole("button", { name: "Start Scrape" }));
    expect((await screen.findAllByText("Legal source format changed")).length).toBeGreaterThanOrEqual(2);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    fireEvent.click(screen.getByRole("button", { name: "Start Scrape" }));
    expect(await screen.findByText("113 clauses retrieved")).toBeInTheDocument();
    expect(scrapeMock).toHaveBeenCalledTimes(2);
  });
});
