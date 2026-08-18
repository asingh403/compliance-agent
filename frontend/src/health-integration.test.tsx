import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError, getHealth, getReadiness } from "./api";
import { App } from "./App";

vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api")>();
  return {
    ...actual,
    getHealth: vi.fn(),
    getReadiness: vi.fn(),
  };
});

const healthMock = vi.mocked(getHealth);
const readinessMock = vi.mocked(getReadiness);

beforeEach(() => {
  healthMock.mockReset();
  readinessMock.mockReset();
});

describe("health and readiness integration", () => {
  it("prevents duplicate health requests and renders success diagnostics", async () => {
    let resolveHealth: ((value: Awaited<ReturnType<typeof getHealth>>) => void) | undefined;
    healthMock.mockReturnValue(new Promise((resolve) => { resolveHealth = resolve; }));
    render(<App />);

    const button = screen.getByRole("button", { name: "Run Health Check" });
    fireEvent.click(button);
    expect(screen.getByRole("button", { name: "Checking..." })).toHaveClass("quick-action--in-progress");
    expect(screen.getByRole("article", { name: "Health: In Progress" })).toHaveClass("workflow-step--in-progress");
    expect(screen.getByRole("button", { name: "Checking..." })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Checking..." }));
    expect(healthMock).toHaveBeenCalledTimes(1);

    resolveHealth?.({
      status: 200,
      requestId: "health-request-id",
      data: {
        status: "ok",
        service: "compliance-coverage-agent-backend",
        environment: "test",
        timestamp: "2026-08-18T00:00:00.000Z",
      },
    });

    expect((await screen.findAllByText("Backend operational")).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("button", { name: "Run Health Check" })).toHaveClass("quick-action--completed");
    expect(screen.getByRole("article", { name: "Health: Completed" })).toHaveClass("workflow-step--completed");
    expect(screen.getByText("Health check completed")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Details"));
    expect(screen.getByText("health-request-id")).toBeInTheDocument();
  });

  it("shows readiness failure guidance, diagnostics, and retry", async () => {
    readinessMock.mockRejectedValueOnce(new ApiClientError({
      code: "DEPENDENCY_UNAVAILABLE",
      message: "MongoDB readiness check failed",
      status: 503,
      requestId: "readiness-request-id",
    }));
    readinessMock.mockResolvedValueOnce({
      status: 200,
      requestId: "readiness-retry-id",
      data: {
        status: "ready",
        dependencies: { mongodb: "available" },
        timestamp: "2026-08-18T00:01:00.000Z",
      },
    });
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Check Readiness" }));
    expect((await screen.findAllByText("Database unavailable")).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/Ingestion may fail until readiness is restored/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => expect(readinessMock).toHaveBeenCalledTimes(2));
    expect((await screen.findAllByText("MongoDB available")).length).toBeGreaterThanOrEqual(2);
  });
});
