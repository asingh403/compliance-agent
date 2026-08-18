import type { ComplianceRetrievalData, HealthData, LegalSourceIngestionData, LegalSourceScrapeData, ReadinessData } from "../api";
import type { WorkflowStatus } from "./workflow";

export interface OperationErrorView {
  code: string;
  title: string;
  message: string;
  requestId: string | null;
  retryable: boolean;
}

export interface OperationState<TData> {
  status: WorkflowStatus;
  data: TData | null;
  error: OperationErrorView | null;
  requestId: string | null;
  lastRunAt: string | null;
}

export type HealthOperationState = OperationState<HealthData>;
export type ReadinessOperationState = OperationState<ReadinessData>;
export type ScrapeOperationState = OperationState<LegalSourceScrapeData>;
export type IngestionOperationState = OperationState<LegalSourceIngestionData>;
export type RetrievalOperationState = OperationState<ComplianceRetrievalData>;

export const initialOperationState = <TData>(): OperationState<TData> => ({
  status: "not-started",
  data: null,
  error: null,
  requestId: null,
  lastRunAt: null,
});
