import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError, startGdprScrape } from "./api";
import { App } from "./App";

vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api")>();
  return { ...actual, startGdprScrape: vi.fn() };
});

const scrapeMock = vi.mocked(startGdprScrape);

beforeEach(() => scrapeMock.mockReset());

describe("GDPR scrape integration", () => {
  it("requires confirmation and supports cancellation", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Start GDPR Scrape" }));
    expect(screen.getByRole("dialog", { name: "Refresh GDPR legal source?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(scrapeMock).not.toHaveBeenCalled();
  });

  it("shows indeterminate loading and renders real scrape results", async () => {
    let resolveScrape: ((value: Awaited<ReturnType<typeof startGdprScrape>>) => void) | undefined;
    scrapeMock.mockReturnValue(new Promise((resolve) => { resolveScrape = resolve; }));
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Start GDPR Scrape" }));
    fireEvent.click(screen.getByRole("button", { name: "Start Scrape" }));
    expect(screen.getByRole("button", { name: "Scraping..." })).toBeDisabled();
    expect(scrapeMock).toHaveBeenCalledTimes(1);

    resolveScrape?.({
      status: 201,
      requestId: "gdpr-scrape-request",
      data: {
        standard: "GDPR",
        sourceUrl: "https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng",
        scrapedAt: "2026-08-18T00:10:00.000Z",
        clauseCount: 99,
        stagingArtifact: "gdpr.normalized.json",
      },
    });

    expect(await screen.findByText("99 clauses retrieved")).toBeInTheDocument();
    expect(screen.getAllByText("99").length).toBeGreaterThanOrEqual(1);
    fireEvent.click(screen.getByText("Details"));
    expect(screen.getByText("gdpr-scrape-request")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View EUR-Lex" })).toHaveAttribute(
      "href",
      "https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng",
    );
  });

  it("maps source failures and allows a confirmed retry", async () => {
    scrapeMock.mockRejectedValueOnce(new ApiClientError({
      code: "SCRAPE_SOURCE_UNAVAILABLE",
      message: "Unable to retrieve the legal source",
      status: 502,
      requestId: "failed-scrape-request",
    }));
    scrapeMock.mockResolvedValueOnce({
      status: 201,
      requestId: "retry-request",
      data: {
        standard: "GDPR",
        sourceUrl: "https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng",
        scrapedAt: "2026-08-18T00:11:00.000Z",
        clauseCount: 99,
        stagingArtifact: "gdpr.normalized.json",
      },
    });
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Start GDPR Scrape" }));
    fireEvent.click(screen.getByRole("button", { name: "Start Scrape" }));
    expect((await screen.findAllByText("Legal source unavailable")).length).toBeGreaterThanOrEqual(2);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    fireEvent.click(screen.getByRole("button", { name: "Start Scrape" }));
    expect(await screen.findByText("99 clauses retrieved")).toBeInTheDocument();
    expect(scrapeMock).toHaveBeenCalledTimes(2);
  });
});
