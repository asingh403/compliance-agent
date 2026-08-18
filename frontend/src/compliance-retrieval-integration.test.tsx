import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { retrieveCompliance } from "./api";
import { App } from "./App";
import { TRUST_USAGE_STORAGE_KEY } from "./hooks/useTrustUsage";

vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api")>();
  return { ...actual, retrieveCompliance: vi.fn() };
});

vi.mock("./components/VoiceRecorder", () => ({
  VoiceRecorder: ({ onTranscript }: { onTranscript: (transcript: string) => boolean }) => (
    <button type="button" onClick={() => onTranscript("Users can request erasure of personal data.")}>Insert test transcript</button>
  ),
}));

const retrieveMock = vi.mocked(retrieveCompliance);

beforeEach(() => {
  retrieveMock.mockReset();
  localStorage.setItem(TRUST_USAGE_STORAGE_KEY, "accepted");
});

describe("compliance retrieval UI", () => {
  it("opens retrieval from Quick Actions with the configured defaults", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Open Retrieval" }));

    expect(screen.getByRole("heading", { name: "Compliance Retrieval", level: 2 })).toBeInTheDocument();
    expect(screen.getByLabelText("Requirement")).toHaveValue("");
    expect(screen.getByLabelText("Both")).toBeChecked();
    expect(screen.getByLabelText("Top K")).toHaveValue(10);
    expect(screen.getByLabelText("Similarity Threshold")).toHaveValue(0.65);
    expect(screen.queryByText("Required")).not.toBeInTheDocument();
    expect(screen.getByText("AI can make mistakes. Review the retrieved evidence and confirm it with the official legal text.")).toBeInTheDocument();
  });

  it("inserts a completed voice transcript into the Requirement field for review", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Open Retrieval" }));
    fireEvent.change(screen.getByLabelText("Requirement"), { target: { value: "Existing context." } });
    fireEvent.click(screen.getByRole("button", { name: "Insert test transcript" }));

    expect(screen.getByLabelText("Requirement")).toHaveValue(
      "Existing context. Users can request erasure of personal data.",
    );
    expect(retrieveMock).not.toHaveBeenCalled();
  });

  it("validates controls locally without sending an invalid request", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Open Retrieval" }));
    fireEvent.change(screen.getByLabelText("Top K"), { target: { value: "51" } });
    fireEvent.change(screen.getByLabelText("Similarity Threshold"), { target: { value: "1.1" } });
    fireEvent.click(screen.getByRole("button", { name: "Retrieve Evidence" }));

    expect(screen.getByText("Enter a compliance requirement.")).toBeInTheDocument();
    expect(screen.getByText("Top K must be a whole number from 1 to 50.")).toBeInTheDocument();
    expect(screen.getByText("Threshold must be between 0 and 1.")).toBeInTheDocument();
    expect(retrieveMock).not.toHaveBeenCalled();
  });

  it("ignores rapid duplicate retrieval submissions while one request is active", async () => {
    let resolveRetrieval: ((value: Awaited<ReturnType<typeof retrieveCompliance>>) => void) | undefined;
    retrieveMock.mockReturnValue(new Promise((resolve) => { resolveRetrieval = resolve; }));
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Open Retrieval" }));
    fireEvent.change(screen.getByLabelText("Requirement"), { target: { value: "A reviewed compliance requirement." } });
    const form = screen.getByRole("button", { name: "Retrieve Evidence" }).closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(retrieveMock).toHaveBeenCalledTimes(1);

    resolveRetrieval?.({
      status: 200,
      requestId: "duplicate-protected-request",
      data: {
        results: [],
        coverage: { score: 0, type: "indicative-retrieval-coverage", disclaimer: "Not a compliance determination." },
        retrieval: {
          embeddingModel: "mistral-embed",
          rerankingModel: null,
          rerankingProvider: null,
          rerankingApplied: false,
          resultSource: "vector-search",
          topK: 10,
          similarityThreshold: 0.65,
        },
      },
    });
    expect(await screen.findByText("No relevant regulatory evidence found")).toBeInTheDocument();
  });

  it("submits the validated body and renders evidence with score hierarchy", async () => {
    let resolveRetrieval: ((value: Awaited<ReturnType<typeof retrieveCompliance>>) => void) | undefined;
    retrieveMock.mockReturnValue(new Promise((resolve) => { resolveRetrieval = resolve; }));
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Open Retrieval" }));
    fireEvent.change(screen.getByLabelText("Requirement"), { target: { value: "Automated decisions use personal data." } });
    fireEvent.click(screen.getByLabelText("GDPR"));
    fireEvent.click(screen.getByRole("button", { name: "Retrieve Evidence" }));

    expect(screen.getAllByRole("button", { name: "Retrieving..." })).toHaveLength(2);
    expect(screen.getAllByText("Analyzing requirement...").length).toBeGreaterThanOrEqual(1);
    expect(retrieveMock).toHaveBeenCalledWith({
      requirement: "Automated decisions use personal data.",
      standards: ["GDPR"],
      topK: 10,
      similarityThreshold: 0.65,
    }, expect.any(AbortSignal));

    resolveRetrieval?.({
      status: 200,
      requestId: "retrieval-ui-request",
      data: {
        results: [{
          standard: "GDPR",
          clauseId: "Article 22",
          title: "Automated individual decision-making",
          excerpt: "1. Automated decisions shall be subject to safeguards. 2. The data subject shall have the right to obtain human intervention under Article 22(3).",
          sourceUrl: "https://eur-lex.europa.eu/eli/reg/2016/679/art_22/oj",
          vectorScore: 0.84,
          rerankingScore: 0.91,
          finalScore: 0.889,
          explanation: "Relevant to automated decisions.",
          evidence: [],
        }],
        coverage: {
          score: 78,
          type: "indicative-retrieval-coverage",
          disclaimer: "This score is not a legal compliance determination.",
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

    expect(await screen.findByText("Article 22")).toBeInTheDocument();
    expect(screen.getByText("Automated individual decision-making")).toBeInTheDocument();
    expect(screen.getByText("0.889")).toBeInTheDocument();
    expect(screen.getByText("0.84")).toBeInTheDocument();
    expect(screen.getByText("0.91")).toBeInTheDocument();
    expect(screen.getByText("Relevant to automated decisions.")).toBeInTheDocument();
    expect(screen.getByText("1. Automated decisions shall be subject to safeguards.")).toBeInTheDocument();
    expect(screen.getByText("2. The data subject shall have the right to obtain human intervention under Article 22(3).")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View Official Source/ })).toHaveAttribute(
      "href",
      "https://eur-lex.europa.eu/eli/reg/2016/679/art_22/oj",
    );
    expect(screen.getByRole("meter", { name: "Indicative retrieval coverage" })).toHaveAttribute("aria-valuenow", "78");
    expect(screen.getByText("This score is not a legal compliance determination.")).toBeInTheDocument();
    expect(screen.getAllByText("retrieval-ui-request").length).toBeGreaterThanOrEqual(1);
  });

  it("shows vector-search results with a non-blocking reranking fallback warning", async () => {
    retrieveMock.mockResolvedValue({
      status: 200,
      requestId: "fallback-request",
      data: {
        results: [{
          standard: "EU_AI_ACT",
          clauseId: "Article 10",
          title: "Data and data governance",
          excerpt: "Training data sets shall be subject to data governance practices.",
          sourceUrl: "https://eur-lex.europa.eu/eli/reg/2024/1689/art_10/oj",
          vectorScore: 0.76,
          rerankingScore: null,
          finalScore: 0.76,
          explanation: "Retrieved from the legal corpus based on semantic similarity.",
          evidence: [],
        }],
        coverage: {
          score: 62,
          type: "indicative-retrieval-coverage",
          disclaimer: "Evidence coverage only; not a compliance determination.",
        },
        retrieval: {
          embeddingModel: "mistral-embed",
          rerankingModel: null,
          rerankingProvider: null,
          rerankingApplied: false,
          resultSource: "vector-search",
          topK: 10,
          similarityThreshold: 0.65,
          fallback: { applied: true, reason: "RERANKING_UNAVAILABLE" },
        },
      },
    });
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Open Retrieval" }));
    fireEvent.change(screen.getByLabelText("Requirement"), { target: { value: "Training data governance is required." } });
    fireEvent.click(screen.getByRole("button", { name: "Retrieve Evidence" }));

    expect(await screen.findByText("Reranking unavailable")).toBeInTheDocument();
    expect(screen.getByText("Results are currently ordered using vector similarity.")).toBeInTheDocument();
    expect(screen.getByText("RERANKING_UNAVAILABLE")).toBeInTheDocument();
    expect(screen.getAllByText("Not applied").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Article 10")).toBeInTheDocument();
  });

  it("identifies Cohere when it reranks after Groq is unavailable", async () => {
    retrieveMock.mockResolvedValue({
      status: 200,
      requestId: "cohere-fallback-request",
      data: {
        results: [{
          standard: "GDPR",
          clauseId: "Article 17",
          title: "Right to erasure",
          excerpt: "The data subject shall have the right to obtain erasure.",
          sourceUrl: "https://eur-lex.europa.eu/eli/reg/2016/679/art_17/oj",
          vectorScore: 0.82,
          rerankingScore: 0.94,
          finalScore: 0.898,
          explanation: "Cohere reranking identified this clause as relevant to the requirement.",
          evidence: [],
        }],
        coverage: {
          score: 74,
          type: "indicative-retrieval-coverage",
          disclaimer: "Evidence coverage only; not a compliance determination.",
        },
        retrieval: {
          embeddingModel: "mistral-embed",
          rerankingModel: "rerank-v4.0-fast",
          rerankingProvider: "cohere",
          rerankingApplied: true,
          resultSource: "reranked",
          topK: 10,
          similarityThreshold: 0.65,
          rerankingFallback: {
            applied: true,
            from: "groq",
            to: "cohere",
            reason: "RERANKING_OUTPUT_INVALID",
          },
        },
      },
    });
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Open Retrieval" }));
    fireEvent.change(screen.getByLabelText("Requirement"), { target: { value: "Users can request data deletion." } });
    fireEvent.click(screen.getByRole("button", { name: "Retrieve Evidence" }));

    expect(await screen.findByText("Reranked via Cohere")).toHaveClass("retrieval-source-badge--reranked");
    expect(screen.getAllByText("Reranking completed via Cohere").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("The GROQ response could not be validated, so Cohere was applied automatically.")).toBeInTheDocument();
    expect(screen.queryByText("RERANKING_OUTPUT_INVALID")).not.toBeInTheDocument();
    expect(screen.getAllByText("Cohere").length).toBeGreaterThanOrEqual(1);
  });

  it("renders guidance when no evidence passes the retrieval threshold", async () => {
    retrieveMock.mockResolvedValue({
      status: 200,
      requestId: "empty-request",
      data: {
        results: [],
        coverage: {
          score: 0,
          type: "indicative-retrieval-coverage",
          disclaimer: "No retrieved evidence is not a compliance determination.",
        },
        retrieval: {
          embeddingModel: "mistral-embed",
          rerankingModel: null,
          rerankingProvider: null,
          rerankingApplied: false,
          resultSource: "vector-search",
          topK: 10,
          similarityThreshold: 0.65,
        },
      },
    });
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Open Retrieval" }));
    fireEvent.change(screen.getByLabelText("Requirement"), { target: { value: "An unrelated requirement." } });
    fireEvent.click(screen.getByRole("button", { name: "Retrieve Evidence" }));

    expect(await screen.findByText("No relevant regulatory evidence found")).toBeInTheDocument();
    expect(screen.getByText(/lowering the similarity threshold/)).toBeInTheDocument();
    expect(screen.getByRole("meter", { name: "Indicative retrieval coverage" })).toHaveAttribute("aria-valuenow", "0");
  });
});
