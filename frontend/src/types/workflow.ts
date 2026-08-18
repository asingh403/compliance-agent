export type WorkflowStatus =
  | "not-started"
  | "in-progress"
  | "completed"
  | "completed-with-warnings"
  | "failed";

export interface WorkflowStep {
  id: string;
  number: number;
  label: string;
  description: string;
  status: WorkflowStatus;
}

export interface WorkflowStepDetail {
  headline: string | null;
  detail: string | null;
  requestId: string | null;
  timestamp: string | null;
  errorCode: string | null;
  onRetry: (() => void) | null;
  diagnostics: Array<{
    label: string;
    value: string;
    href: string | null;
  }>;
}

export const initialWorkflowSteps: WorkflowStep[] = [
  { id: "health", number: 1, label: "Health", description: "Backend availability", status: "not-started" },
  { id: "readiness", number: 2, label: "Readiness", description: "MongoDB connectivity", status: "not-started" },
  { id: "gdpr-scrape", number: 3, label: "GDPR Scrape", description: "Refresh legal source", status: "not-started" },
  { id: "gdpr-ingestion", number: 4, label: "GDPR Ingestion", description: "Embed and index clauses", status: "not-started" },
  { id: "eu-ai-act-scrape", number: 5, label: "EU AI Act Scrape", description: "Refresh legal source", status: "not-started" },
  { id: "eu-ai-act-ingestion", number: 6, label: "EU AI Act Ingestion", description: "Embed and index clauses", status: "not-started" },
  { id: "retrieval", number: 7, label: "Compliance Retrieval", description: "Find regulatory evidence", status: "not-started" },
];
