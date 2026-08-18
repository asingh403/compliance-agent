import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { retrieveCompliance } from "./api";
import { App } from "./App";
import { TRUST_USAGE_STORAGE_KEY } from "./hooks/useTrustUsage";

vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api")>();
  return { ...actual, retrieveCompliance: vi.fn() };
});

const retrieveMock = vi.mocked(retrieveCompliance);

const emptyResponse = {
  status: 200,
  requestId: "accepted-retrieval",
  data: {
    results: [],
    coverage: {
      score: 0,
      type: "indicative-retrieval-coverage" as const,
      disclaimer: "This score is not a legal compliance determination.",
    },
    retrieval: {
      embeddingModel: "mistral-embed",
      rerankingModel: null,
      rerankingProvider: null,
      rerankingApplied: false,
      resultSource: "vector-search" as const,
      topK: 10,
      similarityThreshold: 0.65,
    },
  },
};

beforeEach(() => {
  retrieveMock.mockReset();
  localStorage.removeItem(TRUST_USAGE_STORAGE_KEY);
});

describe("Trust & Usage", () => {
  it("is available from Help and states every required usage boundary", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Open Trust & Usage" }));

    expect(screen.getByRole("dialog", { name: "Trust & Usage" })).toBeInTheDocument();
    expect(screen.getByText("AI-assisted output is not legal advice.")).toBeInTheDocument();
    expect(screen.getByText("Human review is required for regulatory interpretation.")).toBeInTheDocument();
    expect(screen.getByText("Indicative retrieval coverage is not compliance certification.")).toBeInTheDocument();
    expect(screen.getByText("Activity may be logged for security and auditability.")).toBeInTheDocument();
    expect(screen.getByText("Do not enter credentials, secrets, or unnecessary sensitive data.")).toBeInTheDocument();
  });

  it("holds the first retrieval until acknowledgment and persists acceptance", async () => {
    retrieveMock.mockResolvedValue(emptyResponse);
    const first = render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Open Retrieval" }));
    fireEvent.change(screen.getByLabelText("Requirement"), { target: { value: "Users may request data deletion." } });
    fireEvent.click(screen.getByRole("button", { name: "Retrieve Evidence" }));

    expect(screen.getByRole("dialog", { name: "Trust & Usage" })).toBeInTheDocument();
    expect(screen.getByText("Your retrieval request will continue after acknowledgment.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Acknowledge and Continue" })).toBeDisabled();
    expect(retrieveMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText(/I understand these limitations/));
    fireEvent.click(screen.getByRole("button", { name: "Acknowledge and Continue" }));

    await waitFor(() => expect(retrieveMock).toHaveBeenCalledTimes(1));
    expect(localStorage.getItem(TRUST_USAGE_STORAGE_KEY)).toBe("accepted");
    expect(screen.queryByRole("dialog", { name: "Trust & Usage" })).not.toBeInTheDocument();

    first.unmount();
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Open Retrieval" }));
    fireEvent.change(screen.getByLabelText("Requirement"), { target: { value: "A second reviewed requirement." } });
    fireEvent.click(screen.getByRole("button", { name: "Retrieve Evidence" }));
    await waitFor(() => expect(retrieveMock).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("dialog", { name: "Trust & Usage" })).not.toBeInTheDocument();
  });
});
