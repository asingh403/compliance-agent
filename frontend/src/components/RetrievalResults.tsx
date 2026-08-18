import type { ComplianceRetrievalData } from "../api";
import { useEffect, useRef } from "react";
import { CopyButton } from "./CopyButton";

interface RetrievalResultsProps {
  data: ComplianceRetrievalData;
  requestId: string | null;
}

const formatScore = (score: number) => score.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");

const standardLabel = (standard: "GDPR" | "EU_AI_ACT") => standard === "GDPR" ? "GDPR" : "EU AI Act";

const coverageTone = (score: number) => score < 40 ? "low" : score < 70 ? "medium" : "high";

interface LegalTextBlock { text: string; level: 0 | 1 | 2 }

export const structureLegalExcerpt = (value: string): LegalTextBlock[] => {
  const normalized = value.replace(/\s+/g, " ").trim();
  const blocks = normalized.split(/\s+(?=\d+\.\s)|(?<=[;:.])\s+(?=\((?:[a-z]|ii|iii|iv|v|vi|vii|viii|ix|x)\)\s)/i).filter(Boolean);
  return blocks.map((text) => ({
    text,
    level: /^\d+\.\s/.test(text)
      ? 0
      : /^\((?:i|ii|iii|iv|v|vi|vii|viii|ix|x)\)\s/i.test(text)
        ? 2
        : /^\([a-z]\)\s/i.test(text) ? 1 : 0,
  }));
};

const cohereFallbackMessage = (reason: string | undefined) => reason === "RERANKING_OUTPUT_INVALID"
  ? "The GROQ response could not be validated, so Cohere was applied automatically."
  : reason === "RERANKING_UNAVAILABLE"
    ? "GROQ could not be reached, so Cohere was applied automatically."
    : "The primary reranker could not be used, so Cohere was applied automatically.";

export const RetrievalResults = ({ data, requestId }: RetrievalResultsProps) => {
  const orderedResults = [...data.results].sort((left, right) => right.finalScore - left.finalScore);
  const fallback = data.retrieval.fallback?.applied;
  const providerFallback = data.retrieval.rerankingFallback?.applied;
  const providerLabel = data.retrieval.rerankingProvider === "groq"
    ? "GROQ"
    : data.retrieval.rerankingProvider === "cohere" ? "Cohere" : "Not applied";
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <section className="retrieval-results" aria-labelledby="retrieval-results-title">
      {fallback ? (
        <div className="retrieval-fallback" role="status">
          <div>
            <strong>Reranking unavailable</strong>
            <span>Results are currently ordered using vector similarity.</span>
          </div>
          <small>{data.retrieval.fallback?.reason}</small>
        </div>
      ) : null}

      {providerFallback ? (
        <div className="retrieval-fallback" role="status">
          <div>
            <strong>Reranking completed via Cohere</strong>
            <span>{cohereFallbackMessage(data.retrieval.rerankingFallback?.reason)}</span>
          </div>
        </div>
      ) : null}

      <div className="coverage-card">
        <div>
          <span className="section-eyebrow">Evidence coverage</span>
          <h3>Indicative Retrieval Coverage</h3>
          <p>{data.coverage.disclaimer}</p>
        </div>
        <div
          className={`coverage-score coverage-score--${coverageTone(data.coverage.score)}`}
          role="meter"
          aria-label="Indicative retrieval coverage"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={data.coverage.score}
        >
          <strong>{data.coverage.score}</strong>
          <span>/ 100</span>
        </div>
      </div>

      <div className="retrieval-results__heading">
        <div>
          <h3 id="retrieval-results-title" ref={heading} tabIndex={-1}>Retrieved evidence</h3>
          <span>{orderedResults.length} {orderedResults.length === 1 ? "result" : "results"} · ordered by final score</span>
        </div>
        <span className={`retrieval-source-badge retrieval-source-badge--${data.retrieval.resultSource}`}>
          {data.retrieval.resultSource === "reranked" ? `Reranked via ${providerLabel}` : "Vector-search results"}
        </span>
      </div>

      {orderedResults.length === 0 ? (
        <div className="retrieval-empty" role="status">
          <strong>No relevant regulatory evidence found</strong>
          <p>Try broadening the requirement, selecting both standards, increasing Top K, or lowering the similarity threshold.</p>
        </div>
      ) : (
        <div className="evidence-list">
          {orderedResults.map((result) => (
            <article className="evidence-card" key={`${result.standard}-${result.clauseId}`}>
              <div className="evidence-card__main">
                <div className="evidence-card__identity">
                  <span className="standard-badge">{standardLabel(result.standard)}</span>
                  <span>{result.clauseId}</span>
                </div>
                <h4>{result.title}</h4>
                <div className="evidence-card__excerpt">
                  {structureLegalExcerpt(result.excerpt).map((block, index) => (
                    <p className={`evidence-card__legal-block evidence-card__legal-block--level-${block.level}`} key={`${result.clauseId}-paragraph-${index}`}>{block.text}</p>
                  ))}
                </div>
                <div className="evidence-card__explanation">
                  <strong>Why this evidence is relevant</strong>
                  <p>{result.explanation}</p>
                </div>
                <a href={result.sourceUrl} target="_blank" rel="noreferrer">View Official Source <span aria-hidden="true">↗</span></a>
              </div>
              <div className="evidence-scores" aria-label={`Scores for ${result.clauseId}`}>
                <div className="evidence-score evidence-score--final">
                  <span>Final Score</span>
                  <strong>{formatScore(result.finalScore)}</strong>
                </div>
                <div className="evidence-score">
                  <span>Vector</span>
                  <strong>{formatScore(result.vectorScore)}</strong>
                </div>
                <div className="evidence-score">
                  <span>Reranking</span>
                  <strong>{result.rerankingScore === null ? "Not applied" : formatScore(result.rerankingScore)}</strong>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <details className="retrieval-diagnostics">
        <summary>Retrieval diagnostics</summary>
        <dl>
          <div><dt>Embedding model</dt><dd>{data.retrieval.embeddingModel}</dd></div>
          <div><dt>Reranking model</dt><dd>{data.retrieval.rerankingModel ?? "Not applied"}</dd></div>
          <div><dt>Reranking provider</dt><dd>{providerLabel}</dd></div>
          {providerFallback ? <div><dt>Provider fallback</dt><dd>GROQ → Cohere</dd></div> : null}
          <div><dt>Top K</dt><dd>{data.retrieval.topK}</dd></div>
          <div><dt>Similarity threshold</dt><dd>{data.retrieval.similarityThreshold}</dd></div>
          {requestId ? <div><dt>Request ID</dt><dd>{requestId}</dd></div> : null}
        </dl>
        {requestId ? (
          <CopyButton value={requestId} label="Copy Request ID" />
        ) : null}
      </details>
    </section>
  );
};
