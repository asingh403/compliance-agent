import { useEffect, useRef, useState } from "react";

interface CopyButtonProps {
  value: string;
  label: string;
}

export const CopyButton = ({ value, label }: CopyButtonProps) => {
  const [state, setState] = useState<"idle" | "copied" | "unavailable">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(value);
      setState("copied");
    } catch {
      setState("unavailable");
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2_000);
  };

  const text = state === "copied" ? "Copied" : state === "unavailable" ? "Copy unavailable" : label;
  return <button type="button" onClick={() => void copy()} aria-live="polite">{text}</button>;
};
