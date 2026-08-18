import type { WorkflowStep, WorkflowStepDetail } from "../types/workflow";
import { WorkflowStepCard } from "./WorkflowStepCard";

interface WorkflowBoardProps {
  steps: WorkflowStep[];
  detailsByStep: Record<string, WorkflowStepDetail>;
}

export const WorkflowBoard = ({ steps, detailsByStep }: WorkflowBoardProps) => {
  const inProgress = steps.filter((step) => step.status === "in-progress").length;
  const completed = steps.filter((step) => step.status === "completed" || step.status === "completed-with-warnings").length;
  const activityLabel = inProgress > 0
    ? `${inProgress} ${inProgress === 1 ? "operation" : "operations"} in progress`
    : completed > 0
      ? `${completed} of ${steps.length} steps completed`
      : "No operations run";
  return (
  <section className="workflow-board" aria-labelledby="workflow-board-title">
    <div className="section-heading">
      <div>
        <span className="section-eyebrow">Pipeline</span>
        <h2 id="workflow-board-title">7-step Compliance Workflow</h2>
      </div>
      <span className="section-heading__meta" aria-live="polite">{activityLabel}</span>
    </div>
    <div className="workflow-track" role="list" tabIndex={0} aria-label="Compliance workflow steps; scroll horizontally to review all seven steps">
      {steps.map((step, index) => (
        <div className="workflow-track__item" role="listitem" key={step.id}>
          <WorkflowStepCard step={step} detail={detailsByStep[step.id] ?? null} />
          {index < steps.length - 1 ? <span className="workflow-connector" aria-hidden="true" /> : null}
        </div>
      ))}
    </div>
  </section>
  );
};
