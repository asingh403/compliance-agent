import type { WorkflowStatus, WorkflowStep, WorkflowStepDetail } from "../types/workflow";
import { CopyButton } from "./CopyButton";

const statusLabel: Record<WorkflowStatus, string> = {
  "not-started": "Not Started",
  "in-progress": "In Progress",
  completed: "Completed",
  "completed-with-warnings": "Completed with Warnings",
  failed: "Failed",
};

interface WorkflowStepCardProps {
  step: WorkflowStep;
  detail: WorkflowStepDetail | null;
}

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? timestamp : new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export const WorkflowStepCard = ({ step, detail }: WorkflowStepCardProps) => (
  <article className={`workflow-step workflow-step--${step.status}`} aria-label={`${step.label}: ${statusLabel[step.status]}`} aria-busy={step.status === "in-progress"}>
    <div className="workflow-step__topline">
      <span className="workflow-step__number">{step.number}</span>
      <span className="status-badge">
        {step.status === "in-progress" ? <span className="spinner spinner--badge" aria-hidden="true" /> : null}
        {statusLabel[step.status]}
      </span>
    </div>
    <h3>{step.label}</h3>
    <p aria-live="polite">{detail?.headline ?? step.description}</p>
    {detail?.detail ? <p className="workflow-step__detail">{detail.detail}</p> : null}
    {detail?.onRetry ? (
      <button className="workflow-step__retry" type="button" onClick={detail.onRetry}>Retry</button>
    ) : null}
    {detail && (detail.requestId || detail.errorCode || detail.timestamp) ? (
      <details className="operation-details">
        <summary>{step.status === "failed" ? "View error" : "Details"}</summary>
        <dl>
          {detail.errorCode ? <><dt>Error code</dt><dd>{detail.errorCode}</dd></> : null}
          {detail.timestamp ? <><dt>Last run</dt><dd>{formatTimestamp(detail.timestamp)}</dd></> : null}
          {detail.diagnostics.map((diagnostic) => (
            <div className="diagnostic-row" key={diagnostic.label}>
              <dt>{diagnostic.label}</dt>
              <dd>
                {diagnostic.href ? (
                  <a href={diagnostic.href} target="_blank" rel="noreferrer">{diagnostic.value}</a>
                ) : diagnostic.value}
              </dd>
            </div>
          ))}
          {detail.requestId ? (
            <>
              <dt>Request ID</dt>
              <dd className="request-id">
                <code>{detail.requestId}</code>
                <CopyButton value={detail.requestId} label="Copy Request ID" />
              </dd>
            </>
          ) : null}
        </dl>
      </details>
    ) : null}
  </article>
);
