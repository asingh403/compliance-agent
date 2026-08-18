import { useCallback, useEffect, useRef, useState } from "react";

export type ToastTone = "success" | "error" | "warning" | "info";

export interface ToastMessage {
  id: number;
  title: string;
  message: string;
  tone: ToastTone;
}

export const useToasts = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismissToast = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<ToastMessage, "id">) => {
    const id = nextId.current++;
    setToasts((current) => {
      const duplicate = current.find((item) => item.title === toast.title && item.message === toast.message);
      if (duplicate) return current;
      return [...current, { ...toast, id }].slice(-4);
    });
    const duration = toast.tone === "error" ? 10_000 : toast.tone === "warning" ? 8_000 : 5_000;
    const timer = setTimeout(() => dismissToast(id), duration);
    timers.current.set(id, timer);
  }, [dismissToast]);

  useEffect(() => () => {
    for (const timer of timers.current.values()) clearTimeout(timer);
    timers.current.clear();
  }, []);

  return { toasts, addToast, dismissToast };
};
