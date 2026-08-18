import { useCallback, useEffect, useRef, useState } from "react";
import { isApiClientError, retrieveCompliance, type ComplianceRetrievalRequest } from "../api";
import { initialOperationState, type OperationErrorView, type RetrievalOperationState } from "../types/operations";
import type { ToastMessage } from "./useToasts";

type AddToast = (toast: Omit<ToastMessage, "id">) => void;

const loadingMessages = [
  "Analyzing requirement...",
  "Searching regulatory clauses...",
  "Ranking evidence...",
];

const retrievalErrorView = (error: unknown): OperationErrorView => {
  const apiError = isApiClientError(error) ? error : null;
  const messages: Record<string, { title: string; message: string }> = {
    INVALID_REQUEST: {
      title: "Retrieval request is invalid",
      message: "Review the requirement and retrieval settings, then try again.",
    },
    EMBEDDING_UNAVAILABLE: {
      title: "Embedding service unavailable",
      message: "The requirement could not be converted into a search embedding.",
    },
    VECTOR_SEARCH_FAILED: {
      title: "Regulatory search unavailable",
      message: "The indexed regulatory clauses could not be searched.",
    },
    RATE_LIMIT_EXCEEDED: {
      title: "Retrieval rate limit reached",
      message: "Wait briefly before submitting another retrieval request.",
    },
  };
  const mapped = apiError ? messages[apiError.code] : undefined;
  return {
    code: apiError?.code ?? "UNKNOWN_ERROR",
    title: mapped?.title ?? "Compliance retrieval failed",
    message: mapped?.message ?? "Regulatory evidence could not be retrieved.",
    requestId: apiError?.requestId ?? null,
    retryable: apiError?.retryable ?? true,
  };
};

export const useComplianceRetrieval = (addToast: AddToast) => {
  const [state, setState] = useState<RetrievalOperationState>(() => initialOperationState());
  const [loadingStep, setLoadingStep] = useState(0);
  const inFlight = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }, []);

  useEffect(() => () => {
    controller.current?.abort();
    clearTimer();
  }, [clearTimer]);

  const run = useCallback(async (request: ComplianceRetrievalRequest) => {
    if (inFlight.current) return;
    inFlight.current = true;
    const nextController = new AbortController();
    controller.current = nextController;
    setLoadingStep(0);
    timer.current = setInterval(() => setLoadingStep((step) => Math.min(step + 1, loadingMessages.length - 1)), 1_400);
    setState((current) => ({ ...current, status: "in-progress", error: null }));
    try {
      const result = await retrieveCompliance(request, nextController.signal);
      const completedWithWarning = Boolean(
        result.data.retrieval.fallback?.applied || result.data.retrieval.rerankingFallback?.applied,
      );
      setState({
        status: completedWithWarning ? "completed-with-warnings" : "completed",
        data: result.data,
        error: null,
        requestId: result.requestId,
        lastRunAt: new Date().toISOString(),
      });
      addToast({
        title: "Compliance retrieval completed",
        message: `${result.data.results.length} evidence ${result.data.results.length === 1 ? "item" : "items"} received`,
        tone: completedWithWarning ? "warning" : "success",
      });
    } catch (error) {
      if (nextController.signal.aborted) return;
      const view = retrievalErrorView(error);
      setState((current) => ({
        ...current,
        status: "failed",
        error: view,
        requestId: view.requestId,
        lastRunAt: new Date().toISOString(),
      }));
      addToast({ title: view.title, message: view.message, tone: "error" });
    } finally {
      clearTimer();
      if (controller.current === nextController) controller.current = null;
      inFlight.current = false;
    }
  }, [addToast, clearTimer]);

  return {
    retrieval: state,
    loadingMessage: loadingMessages[loadingStep] ?? "Analyzing requirement...",
    runRetrieval: run,
  };
};
