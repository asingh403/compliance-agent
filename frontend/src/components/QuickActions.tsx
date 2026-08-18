import type { WorkflowStatus } from "../types/workflow";

interface QuickAction {
  id: string;
  label: string;
  icon: "pulse" | "database" | "download" | "layers" | "search";
  phase: number;
}

const actions: QuickAction[] = [
  { id: "health", label: "Run Health Check", icon: "pulse", phase: 4 },
  { id: "readiness", label: "Check Readiness", icon: "database", phase: 4 },
  { id: "gdpr-scrape", label: "Start GDPR Scrape", icon: "download", phase: 5 },
  { id: "gdpr-ingestion", label: "Start GDPR Ingestion", icon: "layers", phase: 6 },
  { id: "eu-ai-act-scrape", label: "Start EU AI Act Scrape", icon: "download", phase: 7 },
  { id: "eu-ai-act-ingestion", label: "Start EU AI Act Ingestion", icon: "layers", phase: 8 },
  { id: "retrieval", label: "Open Retrieval", icon: "search", phase: 9 },
];

const ActionIcon = ({ icon, loading }: Pick<QuickAction, "icon"> & { loading: boolean }) => {
  if (loading) return <span className="spinner spinner--small" aria-hidden="true" />;
  const paths = {
    pulse: <path d="M3 12h4l2.2-5 4 10 2.2-5H21" />,
    database: <><ellipse cx="12" cy="6" rx="8" ry="3" /><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></>,
    download: <><path d="M12 3v12m0 0 4-4m-4 4-4-4" /><path d="M5 19h14" /></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></>,
  };
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[icon]}
    </svg>
  );
};

interface QuickActionsProps {
  healthStatus: WorkflowStatus;
  readinessStatus: WorkflowStatus;
  gdprScrapeStatus: WorkflowStatus;
  onHealthCheck: () => void;
  onReadinessCheck: () => void;
  onGdprScrape: () => void;
  gdprIngestionStatus: WorkflowStatus;
  onGdprIngestion: () => void;
  euAiActScrapeStatus: WorkflowStatus;
  onEuAiActScrape: () => void;
  euAiActIngestionStatus: WorkflowStatus;
  onEuAiActIngestion: () => void;
  retrievalStatus: WorkflowStatus;
  onOpenRetrieval: () => void;
}

export const QuickActions = ({
  healthStatus,
  readinessStatus,
  gdprScrapeStatus,
  onHealthCheck,
  onReadinessCheck,
  onGdprScrape,
  gdprIngestionStatus,
  onGdprIngestion,
  euAiActScrapeStatus,
  onEuAiActScrape,
  euAiActIngestionStatus,
  onEuAiActIngestion,
  retrievalStatus,
  onOpenRetrieval,
}: QuickActionsProps) => (
  <div className="quick-actions" aria-labelledby="quick-actions-title">
    <div className="quick-actions__heading">
      <h2 id="quick-actions-title">Quick Actions</h2>
      <span>Run operational checks before refreshing legal sources</span>
    </div>
    <div className="quick-actions__list">
      {actions.map((action) => {
        const status = action.id === "health"
          ? healthStatus
          : action.id === "readiness"
            ? readinessStatus
            : action.id === "gdpr-scrape"
              ? gdprScrapeStatus
              : action.id === "gdpr-ingestion"
                ? gdprIngestionStatus
                : action.id === "eu-ai-act-scrape"
                  ? euAiActScrapeStatus
                  : action.id === "eu-ai-act-ingestion"
                    ? euAiActIngestionStatus
                    : action.id === "retrieval"
                      ? retrievalStatus
              : "not-started";
        const enabled = action.phase <= 9;
        const loading = status === "in-progress";
        const label = loading
          ? action.id === "gdpr-scrape"
            ? "Scraping..."
            : action.id === "gdpr-ingestion"
              ? "Ingesting..."
              : action.id === "eu-ai-act-scrape"
                ? "Scraping..."
                : action.id === "eu-ai-act-ingestion"
                  ? "Ingesting..."
                  : action.id === "retrieval"
                    ? "Retrieving..."
              : "Checking..."
          : action.label;
        const onClick = action.id === "health"
          ? onHealthCheck
          : action.id === "readiness"
            ? onReadinessCheck
            : action.id === "gdpr-scrape"
              ? onGdprScrape
              : action.id === "gdpr-ingestion"
                ? onGdprIngestion
                : action.id === "eu-ai-act-scrape"
                  ? onEuAiActScrape
                  : action.id === "eu-ai-act-ingestion"
                    ? onEuAiActIngestion
                    : action.id === "retrieval"
                      ? onOpenRetrieval
              : undefined;
        return (
          <button
            key={action.id}
            className={`quick-action quick-action--${status}`}
            type="button"
            disabled={!enabled || loading}
            onClick={onClick}
            aria-busy={loading}
            title={enabled ? action.label : `Available in Phase ${action.phase}`}
          >
            <ActionIcon icon={action.icon} loading={loading} />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
    {readinessStatus === "failed" ? (
      <div className="context-warning" role="status">
        <strong>MongoDB unavailable.</strong> Ingestion may fail until readiness is restored.
      </div>
    ) : null}
  </div>
);
