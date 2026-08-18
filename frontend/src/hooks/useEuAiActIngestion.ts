import { useCallback, useEffect, useRef, useState } from "react";
import { isApiClientError, startEuAiActIngestion } from "../api";
import { initialOperationState, type IngestionOperationState, type OperationErrorView } from "../types/operations";
import type { ToastMessage } from "./useToasts";

type AddToast = (toast: Omit<ToastMessage, "id">) => void;

const ingestionErrorView = (error: unknown): OperationErrorView => {
  const apiError = isApiClientError(error) ? error : null;
  if (apiError?.code === "STAGING_SNAPSHOT_INVALID") {
    return {
      code: apiError.code,
      title: "Ingestion cannot start",
      message: "The staged EU AI Act snapshot is missing or invalid. Run the EU AI Act scrape first.",
      requestId: apiError.requestId ?? null,
      retryable: apiError.retryable,
    };
  }
  if (apiError?.code === "DATABASE_SETUP_FAILED") {
    return {
      code: apiError.code,
      title: "Database unavailable",
      message: "The application could not prepare EU AI Act clause storage in MongoDB.",
      requestId: apiError.requestId ?? null,
      retryable: apiError.retryable,
    };
  }
  if (apiError?.code === "EMBEDDING_UNAVAILABLE") {
    return {
      code: apiError.code,
      title: "Embedding service unavailable",
      message: "EU AI Act ingestion cannot continue because embeddings could not be generated.",
      requestId: apiError.requestId ?? null,
      retryable: apiError.retryable,
    };
  }
  return {
    code: apiError?.code ?? "UNKNOWN_ERROR",
    title: "EU AI Act ingestion failed",
    message: "The staged EU AI Act clauses could not be ingested.",
    requestId: apiError?.requestId ?? null,
    retryable: apiError?.retryable ?? true,
  };
};

export const useEuAiActIngestion = (addToast: AddToast) => {
  const [state, setState] = useState<IngestionOperationState>(() => initialOperationState());
  const inFlight = useRef(false);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const run = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    const nextController = new AbortController();
    controller.current = nextController;
    setState((current) => ({ ...current, status: "in-progress", error: null }));
    try {
      const result = await startEuAiActIngestion(nextController.signal);
      const hasWarnings = result.status === 207 || result.data.failed > 0;
      setState({
        status: hasWarnings ? "completed-with-warnings" : "completed",
        data: result.data,
        error: null,
        requestId: result.requestId,
        lastRunAt: new Date().toISOString(),
      });
      addToast({
        title: hasWarnings ? "EU AI Act ingestion completed with warnings" : "EU AI Act ingestion completed",
        message: hasWarnings
          ? `${result.data.failed} failed · ${result.data.updated} updated · ${result.data.unchanged} unchanged`
          : `${result.data.total} clauses processed`,
        tone: hasWarnings ? "warning" : "success",
      });
    } catch (error) {
      if (nextController.signal.aborted) return;
      const view = ingestionErrorView(error);
      setState((current) => ({
        ...current,
        status: "failed",
        error: view,
        requestId: view.requestId,
        lastRunAt: new Date().toISOString(),
      }));
      addToast({ title: view.title, message: view.message, tone: "error" });
    } finally {
      if (controller.current === nextController) controller.current = null;
      inFlight.current = false;
    }
  }, [addToast]);

  return { euAiActIngestion: state, runEuAiActIngestion: run };
};
