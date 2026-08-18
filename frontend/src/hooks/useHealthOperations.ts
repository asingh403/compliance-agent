import { useCallback, useEffect, useRef, useState } from "react";
import { getHealth, getReadiness, isApiClientError } from "../api";
import type { ToastMessage } from "./useToasts";
import {
  initialOperationState,
  type HealthOperationState,
  type OperationErrorView,
  type ReadinessOperationState,
} from "../types/operations";

type AddToast = (toast: Omit<ToastMessage, "id">) => void;

const errorView = (error: unknown, operation: "health" | "readiness"): OperationErrorView => {
  const apiError = isApiClientError(error) ? error : null;
  if (operation === "readiness" && apiError?.code === "DEPENDENCY_UNAVAILABLE") {
    return {
      code: apiError.code,
      title: "Database unavailable",
      message: "The application cannot currently reach MongoDB.",
      requestId: apiError.requestId ?? null,
      retryable: apiError.retryable,
    };
  }
  return {
    code: apiError?.code ?? "UNKNOWN_ERROR",
    title: operation === "health" ? "Backend unavailable" : "Readiness check failed",
    message: operation === "health"
      ? "The Compliance Hub backend could not be reached."
      : "The application could not verify MongoDB readiness.",
    requestId: apiError?.requestId ?? null,
    retryable: apiError?.retryable ?? true,
  };
};

export const useHealthOperations = (addToast: AddToast) => {
  const [health, setHealth] = useState<HealthOperationState>(initialOperationState);
  const [readiness, setReadiness] = useState<ReadinessOperationState>(initialOperationState);
  const inFlight = useRef({ health: false, readiness: false });
  const controllers = useRef(new Set<AbortController>());

  useEffect(() => () => {
    for (const controller of controllers.current) controller.abort();
    controllers.current.clear();
  }, []);

  const runHealth = useCallback(async () => {
    if (inFlight.current.health) return;
    inFlight.current.health = true;
    const controller = new AbortController();
    controllers.current.add(controller);
    setHealth((current) => ({ ...current, status: "in-progress", error: null }));
    try {
      const result = await getHealth(controller.signal);
      setHealth({
        status: "completed",
        data: result.data,
        error: null,
        requestId: result.requestId,
        lastRunAt: result.data.timestamp,
      });
      addToast({ title: "Health check completed", message: "Backend operational", tone: "success" });
    } catch (error) {
      if (controller.signal.aborted) return;
      const view = errorView(error, "health");
      setHealth((current) => ({
        ...current,
        status: "failed",
        error: view,
        requestId: view.requestId,
        lastRunAt: new Date().toISOString(),
      }));
      addToast({ title: view.title, message: view.message, tone: "error" });
    } finally {
      controllers.current.delete(controller);
      inFlight.current.health = false;
    }
  }, [addToast]);

  const runReadiness = useCallback(async () => {
    if (inFlight.current.readiness) return;
    inFlight.current.readiness = true;
    const controller = new AbortController();
    controllers.current.add(controller);
    setReadiness((current) => ({ ...current, status: "in-progress", error: null }));
    try {
      const result = await getReadiness(controller.signal);
      setReadiness({
        status: "completed",
        data: result.data,
        error: null,
        requestId: result.requestId,
        lastRunAt: result.data.timestamp,
      });
      addToast({ title: "Readiness check completed", message: "MongoDB available", tone: "success" });
    } catch (error) {
      if (controller.signal.aborted) return;
      const view = errorView(error, "readiness");
      setReadiness((current) => ({
        ...current,
        status: "failed",
        error: view,
        requestId: view.requestId,
        lastRunAt: new Date().toISOString(),
      }));
      addToast({ title: view.title, message: view.message, tone: "error" });
    } finally {
      controllers.current.delete(controller);
      inFlight.current.readiness = false;
    }
  }, [addToast]);

  return { health, readiness, runHealth, runReadiness };
};
