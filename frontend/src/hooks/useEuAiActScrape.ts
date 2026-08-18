import { useCallback, useEffect, useRef, useState } from "react";
import { isApiClientError, startEuAiActScrape } from "../api";
import { initialOperationState, type OperationErrorView, type ScrapeOperationState } from "../types/operations";
import type { ToastMessage } from "./useToasts";

type AddToast = (toast: Omit<ToastMessage, "id">) => void;

const scrapeErrorView = (error: unknown): OperationErrorView => {
  const apiError = isApiClientError(error) ? error : null;
  if (apiError?.code === "SCRAPE_SOURCE_UNAVAILABLE") {
    return {
      code: apiError.code,
      title: "Legal source unavailable",
      message: "The configured EUR-Lex EU AI Act source could not be retrieved.",
      requestId: apiError.requestId ?? null,
      retryable: apiError.retryable,
    };
  }
  if (apiError?.code === "SCRAPE_STRUCTURE_INVALID") {
    return {
      code: apiError.code,
      title: "Legal source format changed",
      message: "The EU AI Act source did not contain the expected article structure.",
      requestId: apiError.requestId ?? null,
      retryable: apiError.retryable,
    };
  }
  return {
    code: apiError?.code ?? "UNKNOWN_ERROR",
    title: "EU AI Act scrape failed",
    message: "The EU AI Act legal source could not be refreshed.",
    requestId: apiError?.requestId ?? null,
    retryable: apiError?.retryable ?? true,
  };
};

export const useEuAiActScrape = (addToast: AddToast) => {
  const [state, setState] = useState<ScrapeOperationState>(() => initialOperationState());
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
      const result = await startEuAiActScrape(nextController.signal);
      setState({
        status: "completed",
        data: result.data,
        error: null,
        requestId: result.requestId,
        lastRunAt: result.data.scrapedAt,
      });
      addToast({
        title: "EU AI Act scrape completed",
        message: `${result.data.clauseCount} clauses retrieved`,
        tone: "success",
      });
    } catch (error) {
      if (nextController.signal.aborted) return;
      const view = scrapeErrorView(error);
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

  return { euAiActScrape: state, runEuAiActScrape: run };
};
