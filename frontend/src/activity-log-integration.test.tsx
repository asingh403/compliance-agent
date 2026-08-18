import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getActivity } from "./api";
import { App } from "./App";

vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api")>();
  return { ...actual, getActivity: vi.fn() };
});

const activityMock = vi.mocked(getActivity);

beforeEach(() => {
  window.history.replaceState({}, "", "/");
  activityMock.mockReset();
  activityMock.mockResolvedValue({ status: 200, requestId: "activity-list", data: {
    activities: [{
      id: "activity-1", timestamp: new Date().toISOString(), actor: { id: "local-user", displayName: "Local user" },
      action: "COMPLIANCE_RETRIEVAL", status: "WARNING", requestId: "retrieval-request", durationMs: 2400,
      metadata: { standards: ["GDPR"], rerankingProvider: "cohere", fallback: "GROQ_TO_COHERE" },
    }],
    summary: { total: 8, success: 6, warning: 1, failed: 1 },
    pagination: { page: 1, limit: 20, total: 1, pages: 1 },
    range: { from: "2026-08-13T00:00:00.000Z", to: "2026-08-20T00:00:00.000Z" },
  } });
});

afterEach(() => window.history.replaceState({}, "", "/"));

describe("Activity Log screen", () => {
  it("opens from the header, shows seven-day activity, and opens row details", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Activity Log" }));
    expect(window.location.pathname).toBe("/activity");
    expect(screen.getByRole("heading", { name: "Activity Log" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "View Compliance Retrieval details" })).toBeInTheDocument();
    expect(screen.getByText("Last 7 days")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "View Compliance Retrieval details" }));
    expect(screen.getByRole("dialog", { name: "Compliance Retrieval" })).toBeInTheDocument();
    expect(screen.getByText("retrieval-request")).toBeInTheDocument();
    expect(screen.getByText("GROQ_TO_COHERE")).toBeInTheDocument();
  });

  it("applies activity filters and returns to the workflow", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Activity Log" }));
    await screen.findByRole("button", { name: "View Compliance Retrieval details" });
    fireEvent.change(screen.getByLabelText("Filter by status"), { target: { value: "WARNING" } });
    await waitFor(() => expect(activityMock).toHaveBeenLastCalledWith(expect.objectContaining({ status: "WARNING" }), expect.any(AbortSignal)));
    fireEvent.click(screen.getByRole("button", { name: /Back to Workflow/ }));
    expect(window.location.pathname).toBe("/");
    expect(screen.getByRole("heading", { name: "Compliance Workflow" })).toBeInTheDocument();
  });
});
