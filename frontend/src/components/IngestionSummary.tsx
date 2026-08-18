import type { LegalSourceIngestionData } from "../api";
import type { WorkflowStatus } from "../types/workflow";

interface IngestionSummaryProps {
  ingestion: LegalSourceIngestionData | null;
  status: WorkflowStatus;
  standard: "GDPR" | "EU AI Act";
}

export const IngestionSummary = ({ ingestion, status, standard }: IngestionSummaryProps) => {
  const metrics = [
    { label: "Total", value: ingestion?.total },
    { label: "Created", value: ingestion?.created },
    { label: "Updated", value: ingestion?.updated },
    { label: "Unchanged", value: ingestion?.unchanged },
    { label: "Failed", value: ingestion?.failed },
  ];
  const partial = status === "completed-with-warnings";
  const badge = partial ? "Partial ingestion" : status === "completed" ? "Completed" : status === "in-progress" ? "In Progress" : "Not run";

  return (
    <section className="dashboard-card ingestion-summary" aria-labelledby="ingestion-summary-title" aria-busy={status === "in-progress"}>
      <div className="section-heading section-heading--compact">
        <div>
          <span className="section-eyebrow">Latest {standard} operation</span>
          <h2 id="ingestion-summary-title">Ingestion Summary</h2>
        </div>
        <span className={`status-badge${partial ? " status-badge--warning" : ""}`}>{badge}</span>
      </div>
      {status === "in-progress" ? <p className="ingestion-progress"><span className="spinner spinner--small" aria-hidden="true" /> Generating embeddings...</p> : null}
      <div className="ingestion-metrics">
        {metrics.map((metric) => (
          <div className={metric.label === "Failed" && (metric.value ?? 0) > 0 ? "metric--failed" : ""} key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value ?? "—"}</strong>
            <small>clauses</small>
          </div>
        ))}
      </div>
      {ingestion && ingestion.failures.length > 0 ? (
        <details className="failure-details">
          <summary>View {ingestion.failures.length} failure {ingestion.failures.length === 1 ? "detail" : "details"}</summary>
          <ul>
            {ingestion.failures.map((failure) => (
              <li key={`${failure.clauseId}-${failure.code}`}>
                <strong>{failure.clauseId}</strong>
                <span>{failure.code}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
};
