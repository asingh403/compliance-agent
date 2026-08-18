import type { Theme } from "../hooks/useTheme";

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
}

export const ThemeToggle = ({ theme, onToggle }: ThemeToggleProps) => {
  const nextTheme = theme === "light" ? "dim" : "light";
  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={onToggle}
      aria-label={`Switch to ${nextTheme} theme`}
      title={`Switch to ${nextTheme} theme`}
    >
      <span className="theme-toggle__icon" aria-hidden="true">
        {theme === "light" ? "◐" : "☼"}
      </span>
      <span>{theme === "light" ? "Dim" : "Light"}</span>
    </button>
  );
};
