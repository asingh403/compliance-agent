import { useEffect, useRef, useState } from "react";
import type { ComplianceRetrievalRequest, LegalStandard } from "../api";
import type { RetrievalOperationState } from "../types/operations";
import { RetrievalResults } from "./RetrievalResults";
import { VoiceRecorder } from "./VoiceRecorder";

type StandardChoice = "GDPR" | "EU_AI_ACT" | "BOTH";

interface RetrievalPanelProps {
  initialRequirement: string;
  retrieval: RetrievalOperationState;
  loadingMessage: string;
  onSubmit: (request: ComplianceRetrievalRequest) => void;
  onClose: () => void;
}

interface FormErrors {
  requirement?: string;
  topK?: string;
  similarityThreshold?: string;
}

const standardsFor = (choice: StandardChoice): LegalStandard[] => choice === "BOTH"
  ? ["GDPR", "EU_AI_ACT"]
  : [choice];

export const RetrievalPanel = ({
  initialRequirement,
  retrieval,
  loadingMessage,
  onSubmit,
  onClose,
}: RetrievalPanelProps) => {
  const [requirement, setRequirement] = useState(initialRequirement);
  const [standardChoice, setStandardChoice] = useState<StandardChoice>("BOTH");
  const [topK, setTopK] = useState("10");
  const [similarityThreshold, setSimilarityThreshold] = useState("0.65");
  const [errors, setErrors] = useState<FormErrors>({});
  const requirementRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setRequirement(initialRequirement);
    requestAnimationFrame(() => requirementRef.current?.focus());
  }, [initialRequirement]);

  const submit = () => {
    const normalizedRequirement = requirement.trim();
    const normalizedTopK = Number(topK);
    const normalizedThreshold = Number(similarityThreshold);
    const nextErrors: FormErrors = {};
    if (!normalizedRequirement) nextErrors.requirement = "Enter a compliance requirement.";
    else if (normalizedRequirement.length > 10_000) nextErrors.requirement = "Requirement must be 10,000 characters or fewer.";
    if (!Number.isInteger(normalizedTopK) || normalizedTopK < 1 || normalizedTopK > 50) {
      nextErrors.topK = "Top K must be a whole number from 1 to 50.";
    }
    if (!Number.isFinite(normalizedThreshold) || normalizedThreshold < 0 || normalizedThreshold > 1) {
      nextErrors.similarityThreshold = "Threshold must be between 0 and 1.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSubmit({
      requirement: normalizedRequirement,
      standards: standardsFor(standardChoice),
      topK: normalizedTopK,
      similarityThreshold: normalizedThreshold,
    });
  };

  const loading = retrieval.status === "in-progress";
  const appendTranscript = (transcript: string) => {
    const separator = requirement.trim() ? " " : "";
    const nextRequirement = `${requirement.trimEnd()}${separator}${transcript.trim()}`;
    if (nextRequirement.length > 10_000) return false;
    setRequirement(nextRequirement);
    setErrors(({ requirement: _requirement, ...current }) => current);
    requestAnimationFrame(() => requirementRef.current?.focus());
    return true;
  };

  return (
    <section className="retrieval-panel" aria-labelledby="retrieval-panel-title" aria-busy={loading}>
      <div className="section-heading retrieval-panel__heading">
        <div>
          <span className="section-eyebrow">Regulatory evidence search</span>
          <h2 id="retrieval-panel-title">Compliance Retrieval</h2>
          <p>Search indexed GDPR and EU AI Act clauses for evidence relevant to a requirement.</p>
        </div>
        <button className="retrieval-panel__close" type="button" onClick={onClose} disabled={loading} aria-label="Close compliance retrieval">×</button>
      </div>

      <form className="retrieval-form" onSubmit={(event) => { event.preventDefault(); submit(); }} noValidate>
        <div className="form-field retrieval-form__requirement">
          <label htmlFor="retrieval-requirement">Requirement</label>
          <div className="voice-input">
            <textarea
              id="retrieval-requirement"
              ref={requirementRef}
              value={requirement}
              onChange={(event) => setRequirement(event.target.value)}
              rows={4}
              maxLength={10_000}
              disabled={loading}
              aria-describedby={errors.requirement ? "retrieval-requirement-error" : undefined}
              aria-invalid={Boolean(errors.requirement)}
              placeholder="Describe the behavior or obligation to retrieve evidence for..."
            />
            <VoiceRecorder disabled={loading} onTranscript={appendTranscript} />
          </div>
          <p className="requirement-ai-notice">AI can make mistakes. Review the retrieved evidence and confirm it with the official legal text.</p>
          <div className="field-meta">
            {errors.requirement ? <span className="field-error" id="retrieval-requirement-error">{errors.requirement}</span> : null}
            <span className="field-count">{requirement.length.toLocaleString()} / 10,000</span>
          </div>
        </div>

        <fieldset className="form-field retrieval-form__standards" disabled={loading}>
          <legend>Standards</legend>
          <div className="segmented-control">
            {([
              ["GDPR", "GDPR"],
              ["EU_AI_ACT", "EU AI Act"],
              ["BOTH", "Both"],
            ] as const).map(([value, label]) => (
              <label key={value}>
                <input
                  type="radio"
                  name="retrieval-standard"
                  value={value}
                  checked={standardChoice === value}
                  onChange={() => setStandardChoice(value)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="retrieval-form__settings">
          <div className="form-field">
            <label htmlFor="retrieval-top-k">Top K</label>
            <input
              id="retrieval-top-k"
              type="number"
              min="1"
              max="50"
              step="1"
              value={topK}
              onChange={(event) => setTopK(event.target.value)}
              disabled={loading}
              aria-invalid={Boolean(errors.topK)}
              aria-describedby={errors.topK ? "retrieval-top-k-error" : "retrieval-top-k-help"}
            />
            <span className={errors.topK ? "field-error" : "field-help"} id={errors.topK ? "retrieval-top-k-error" : "retrieval-top-k-help"}>
              {errors.topK ?? "Maximum evidence candidates (1–50)"}
            </span>
          </div>
          <div className="form-field">
            <label htmlFor="retrieval-threshold">Similarity Threshold</label>
            <input
              id="retrieval-threshold"
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={similarityThreshold}
              onChange={(event) => setSimilarityThreshold(event.target.value)}
              disabled={loading}
              aria-invalid={Boolean(errors.similarityThreshold)}
              aria-describedby={errors.similarityThreshold ? "retrieval-threshold-error" : "retrieval-threshold-help"}
            />
            <span className={errors.similarityThreshold ? "field-error" : "field-help"} id={errors.similarityThreshold ? "retrieval-threshold-error" : "retrieval-threshold-help"}>
              {errors.similarityThreshold ?? "Minimum vector similarity (0–1)"}
            </span>
          </div>
        </div>

        <div className="retrieval-form__actions">
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? <><span className="spinner spinner--small" aria-hidden="true" /> Retrieving...</> : "Retrieve Evidence"}
          </button>
        </div>
      </form>

      {loading ? <div className="retrieval-state" role="status"><span className="spinner" aria-hidden="true" /><strong>{loadingMessage}</strong><span>Embedding, vector search, and reranking may take a moment.</span></div> : null}
      {retrieval.status === "failed" && retrieval.error ? (
        <div className="retrieval-state retrieval-state--error" role="alert">
          <strong>{retrieval.error.title}</strong>
          <span>{retrieval.error.message}</span>
          {retrieval.requestId ? <small>Request ID: {retrieval.requestId}</small> : null}
        </div>
      ) : null}
      {(retrieval.status === "completed" || retrieval.status === "completed-with-warnings") && retrieval.data ? (
        <RetrievalResults data={retrieval.data} requestId={retrieval.requestId} />
      ) : null}
    </section>
  );
};
