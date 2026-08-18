import type { WorkflowStep } from "../types/workflow";

interface WorkflowSummaryProps {
  steps: WorkflowStep[];
  lastRunAt: string | null;
}

const formatLastRun = (timestamp: string | null) => {
  if (!timestamp) return "—";
  const value = new Date(timestamp);
  if (Number.isNaN(value.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(value);
};

export const WorkflowSummary = ({ steps, lastRunAt }: WorkflowSummaryProps) => {
  const completed = steps.filter((step) => step.status === "completed" || step.status === "completed-with-warnings").length;
  const inProgress = steps.filter((step) => step.status === "in-progress").length;
  const pending = steps.filter((step) => step.status === "not-started").length;
  const metrics = [
    { label: "Total Steps", value: steps.length },
    { label: "Completed", value: completed },
    { label: "In Progress", value: inProgress },
    { label: "Pending", value: pending },
    { label: "Last Run", value: formatLastRun(lastRunAt) },
  ];

  return (
    <section className="workflow-summary" aria-labelledby="workflow-summary-title">
      <h2 className="sr-only" id="workflow-summary-title">Workflow Summary</h2>
      {metrics.map((metric) => (
        <div className="summary-metric" key={metric.label}>
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
        </div>
      ))}
    </section>
  );
};
