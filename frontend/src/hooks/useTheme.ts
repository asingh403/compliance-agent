import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dim";

const storageKey = "compliance-hub-theme";

const initialTheme = (): Theme => {
  if (typeof document !== "undefined" && document.documentElement.dataset.theme === "dim") {
    return "dim";
  }
  return "light";
};

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(storageKey, theme);
    } catch {
      // Theme still works for this session when storage is unavailable.
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => current === "light" ? "dim" : "light");
  }, []);

  return { theme, toggleTheme };
};
