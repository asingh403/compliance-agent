import type { Theme } from "../hooks/useTheme";
import { BrandMark } from "./BrandMark";
import { ThemeToggle } from "./ThemeToggle";

interface HeaderProps {
  theme: Theme;
  onThemeToggle: () => void;
  onTrustUsage: () => void;
  onActivityLog: () => void;
  onHome: () => void;
  activityActive: boolean;
}

export const Header = ({ theme, onThemeToggle, onTrustUsage, onActivityLog, onHome, activityActive }: HeaderProps) => (
  <header className="app-header">
    <div className="app-header__inner">
      <a className="brand" href="/" onClick={(event) => { event.preventDefault(); onHome(); }} aria-label="Compliance Hub home">
        <BrandMark />
        <span className="brand__name">Compliance Hub</span>
      </a>

      <div className="workspace-control">
        <label className="sr-only" htmlFor="workspace-select">Workspace</label>
        <select id="workspace-select" defaultValue="compliance-operations">
          <option value="compliance-operations">Compliance Operations</option>
        </select>
      </div>

      <div className="app-header__actions">
        <button className={`header-activity${activityActive ? " header-activity--active" : ""}`} type="button" onClick={onActivityLog} aria-current={activityActive ? "page" : undefined} aria-label="Activity Log" title="View user activity from the last 7 days" data-tooltip="View user activity from the last 7 days">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5M12 7v5l3 2"/></svg>
        </button>
        <button className="header-help" type="button" onClick={onTrustUsage} aria-label="Open Trust & Usage">Help</button>
        <ThemeToggle theme={theme} onToggle={onThemeToggle} />
      </div>
    </div>
  </header>
);
