import { Header } from "./components/Header";
import { IngestionSummary } from "./components/IngestionSummary";
import { KnowledgeBaseStatus } from "./components/KnowledgeBaseStatus";
import { WorkflowBoard } from "./components/WorkflowBoard";
import { WorkflowHero } from "./components/WorkflowHero";
import { WorkflowSummary } from "./components/WorkflowSummary";
import { ToastRegion } from "./components/ToastRegion";
import { useHealthOperations } from "./hooks/useHealthOperations";
import { useGdprScrape } from "./hooks/useGdprScrape";
import { useGdprIngestion } from "./hooks/useGdprIngestion";
import { useEuAiActScrape } from "./hooks/useEuAiActScrape";
import { useEuAiActIngestion } from "./hooks/useEuAiActIngestion";
import { useComplianceRetrieval } from "./hooks/useComplianceRetrieval";
import { useToasts } from "./hooks/useToasts";
import { initialWorkflowSteps, type WorkflowStepDetail } from "./types/workflow";
import { ConfirmationDialog } from "./components/ConfirmationDialog";
import { useState } from "react";
import { useTheme } from "./hooks/useTheme";
import { RetrievalPanel } from "./components/RetrievalPanel";
import type { ComplianceRetrievalRequest } from "./api";
import { useTrustUsage } from "./hooks/useTrustUsage";
import { TrustUsageDialog } from "./components/TrustUsageDialog";
import { ActivityLogPage } from "./components/ActivityLogPage";
import { useEffect } from "react";

export const App = () => {
  const [screen, setScreen] = useState<"workflow" | "activity">(() => window.location.pathname === "/activity" ? "activity" : "workflow");
  useEffect(() => {
    const handleNavigation = () => setScreen(window.location.pathname === "/activity" ? "activity" : "workflow");
    window.addEventListener("popstate", handleNavigation);
    return () => window.removeEventListener("popstate", handleNavigation);
  }, []);
  const navigate = (next: "workflow" | "activity") => {
    const path = next === "activity" ? "/activity" : "/";
    if (window.location.pathname !== path) window.history.pushState({}, "", path);
    setScreen(next);
  };
  const { theme, toggleTheme } = useTheme();
  const { trustUsageAccepted, acceptTrustUsage } = useTrustUsage();
  const { toasts, addToast, dismissToast } = useToasts();
  const { health, readiness, runHealth, runReadiness } = useHealthOperations(addToast);
  const { gdprScrape, runGdprScrape } = useGdprScrape(addToast);
  const { gdprIngestion, runGdprIngestion } = useGdprIngestion(addToast);
  const { euAiActScrape, runEuAiActScrape } = useEuAiActScrape(addToast);
  const { euAiActIngestion, runEuAiActIngestion } = useEuAiActIngestion(addToast);
  const { retrieval, loadingMessage, runRetrieval } = useComplianceRetrieval(addToast);
  const [gdprConfirmationOpen, setGdprConfirmationOpen] = useState(false);
  const [gdprIngestionConfirmationOpen, setGdprIngestionConfirmationOpen] = useState(false);
  const [euAiActConfirmationOpen, setEuAiActConfirmationOpen] = useState(false);
  const [euAiActIngestionConfirmationOpen, setEuAiActIngestionConfirmationOpen] = useState(false);
  const [retrievalOpen, setRetrievalOpen] = useState(false);
  const [retrievalRequirement, setRetrievalRequirement] = useState("");
  const [lastRetrievalRequest, setLastRetrievalRequest] = useState<ComplianceRetrievalRequest | null>(null);
  const [trustUsageOpen, setTrustUsageOpen] = useState(false);
  const [pendingRetrievalRequest, setPendingRetrievalRequest] = useState<ComplianceRetrievalRequest | null>(null);
  const steps = initialWorkflowSteps.map((step) => {
    if (step.id === "health") return { ...step, status: health.status };
    if (step.id === "readiness") return { ...step, status: readiness.status };
    if (step.id === "gdpr-scrape") return { ...step, status: gdprScrape.status };
    if (step.id === "gdpr-ingestion") return { ...step, status: gdprIngestion.status };
    if (step.id === "eu-ai-act-scrape") return { ...step, status: euAiActScrape.status };
    if (step.id === "eu-ai-act-ingestion") return { ...step, status: euAiActIngestion.status };
    if (step.id === "retrieval") return { ...step, status: retrieval.status };
    return step;
  });
  const detailsByStep: Record<string, WorkflowStepDetail> = {
    health: {
      headline: health.status === "completed"
        ? "Backend operational"
        : health.error?.title ?? (health.status === "in-progress" ? "Checking backend..." : null),
      detail: health.error?.message ?? (health.data ? `${health.data.service} · ${health.data.environment}` : null),
      requestId: health.requestId,
      timestamp: health.lastRunAt,
      errorCode: health.error?.code ?? null,
      onRetry: health.status === "failed" ? runHealth : null,
      diagnostics: [],
    },
    readiness: {
      headline: readiness.status === "completed"
        ? "MongoDB available"
        : readiness.error?.title ?? (readiness.status === "in-progress" ? "Checking MongoDB..." : null),
      detail: readiness.error?.message ?? (readiness.data ? "Database dependency is ready" : null),
      requestId: readiness.requestId,
      timestamp: readiness.lastRunAt,
      errorCode: readiness.error?.code ?? null,
      onRetry: readiness.status === "failed" ? runReadiness : null,
      diagnostics: [],
    },
    "gdpr-scrape": {
      headline: gdprScrape.status === "completed"
        ? `${gdprScrape.data?.clauseCount ?? 0} clauses`
        : gdprScrape.error?.title ?? (gdprScrape.status === "in-progress" ? "Refreshing GDPR source..." : null),
      detail: gdprScrape.error?.message ?? (gdprScrape.data ? `Staged as ${gdprScrape.data.stagingArtifact}` : null),
      requestId: gdprScrape.requestId,
      timestamp: gdprScrape.lastRunAt,
      errorCode: gdprScrape.error?.code ?? null,
      onRetry: gdprScrape.status === "failed" ? () => setGdprConfirmationOpen(true) : null,
      diagnostics: gdprScrape.data ? [
        { label: "Source", value: "View EUR-Lex", href: gdprScrape.data.sourceUrl },
        { label: "Staging artifact", value: gdprScrape.data.stagingArtifact, href: null },
      ] : [],
    },
    "gdpr-ingestion": {
      headline: gdprIngestion.status === "completed"
        ? `${gdprIngestion.data?.total ?? 0} clauses processed`
        : gdprIngestion.status === "completed-with-warnings"
          ? "Partial ingestion"
          : gdprIngestion.error?.title ?? (gdprIngestion.status === "in-progress" ? "Generating embeddings..." : null),
      detail: gdprIngestion.error?.message ?? (gdprIngestion.data
        ? `${gdprIngestion.data.created} created · ${gdprIngestion.data.updated} updated · ${gdprIngestion.data.unchanged} unchanged · ${gdprIngestion.data.failed} failed`
        : null),
      requestId: gdprIngestion.requestId,
      timestamp: gdprIngestion.lastRunAt,
      errorCode: gdprIngestion.error?.code ?? null,
      onRetry: gdprIngestion.status === "failed" ? () => setGdprIngestionConfirmationOpen(true) : null,
      diagnostics: gdprIngestion.data ? [
        { label: "Embedding model", value: gdprIngestion.data.embeddingModel, href: null },
        { label: "Failed clauses", value: String(gdprIngestion.data.failed), href: null },
      ] : [],
    },
    "eu-ai-act-scrape": {
      headline: euAiActScrape.status === "completed"
        ? `${euAiActScrape.data?.clauseCount ?? 0} clauses`
        : euAiActScrape.error?.title ?? (euAiActScrape.status === "in-progress" ? "Refreshing EU AI Act source..." : null),
      detail: euAiActScrape.error?.message ?? (euAiActScrape.data ? `Staged as ${euAiActScrape.data.stagingArtifact}` : null),
      requestId: euAiActScrape.requestId,
      timestamp: euAiActScrape.lastRunAt,
      errorCode: euAiActScrape.error?.code ?? null,
      onRetry: euAiActScrape.status === "failed" ? () => setEuAiActConfirmationOpen(true) : null,
      diagnostics: euAiActScrape.data ? [
        { label: "Source", value: "View EUR-Lex", href: euAiActScrape.data.sourceUrl },
        { label: "Staging artifact", value: euAiActScrape.data.stagingArtifact, href: null },
      ] : [],
    },
    "eu-ai-act-ingestion": {
      headline: euAiActIngestion.status === "completed"
        ? `${euAiActIngestion.data?.total ?? 0} clauses processed`
        : euAiActIngestion.status === "completed-with-warnings"
          ? "Partial ingestion"
          : euAiActIngestion.error?.title ?? (euAiActIngestion.status === "in-progress" ? "Generating embeddings..." : null),
      detail: euAiActIngestion.error?.message ?? (euAiActIngestion.data
        ? `${euAiActIngestion.data.created} created · ${euAiActIngestion.data.updated} updated · ${euAiActIngestion.data.unchanged} unchanged · ${euAiActIngestion.data.failed} failed`
        : null),
      requestId: euAiActIngestion.requestId,
      timestamp: euAiActIngestion.lastRunAt,
      errorCode: euAiActIngestion.error?.code ?? null,
      onRetry: euAiActIngestion.status === "failed" ? () => setEuAiActIngestionConfirmationOpen(true) : null,
      diagnostics: euAiActIngestion.data ? [
        { label: "Embedding model", value: euAiActIngestion.data.embeddingModel, href: null },
        { label: "Failed clauses", value: String(euAiActIngestion.data.failed), href: null },
      ] : [],
    },
    retrieval: {
      headline: retrieval.status === "completed"
        ? retrieval.data?.retrieval.rerankingProvider
          ? `Retrieval completed via ${retrieval.data.retrieval.rerankingProvider === "groq" ? "GROQ" : "Cohere"}`
          : `${retrieval.data?.results.length ?? 0} evidence items received`
        : retrieval.status === "completed-with-warnings"
          ? retrieval.data?.retrieval.rerankingFallback?.applied
            ? "Reranking completed via Cohere"
            : "Retrieval completed with vector fallback"
          : retrieval.error?.title ?? (retrieval.status === "in-progress" ? loadingMessage : null),
      detail: retrieval.error?.message ?? (retrieval.data ? "Response validated · results available in the retrieval panel" : null),
      requestId: retrieval.requestId,
      timestamp: retrieval.lastRunAt,
      errorCode: retrieval.error?.code ?? null,
      onRetry: retrieval.status === "failed" && lastRetrievalRequest ? () => void runRetrieval(lastRetrievalRequest) : null,
      diagnostics: retrieval.data ? [
        { label: "Reranking provider", value: retrieval.data.retrieval.rerankingProvider === "groq" ? "GROQ" : retrieval.data.retrieval.rerankingProvider === "cohere" ? "Cohere" : "Not applied", href: null },
        ...(retrieval.data.retrieval.rerankingFallback?.applied
          ? [{ label: "Provider fallback", value: "GROQ → Cohere", href: null }]
          : []),
        { label: "Top K", value: String(retrieval.data.retrieval.topK), href: null },
        { label: "Similarity threshold", value: String(retrieval.data.retrieval.similarityThreshold), href: null },
      ] : [],
    },
  };
  const lastRunAt = [health.lastRunAt, readiness.lastRunAt, gdprScrape.lastRunAt, gdprIngestion.lastRunAt, euAiActScrape.lastRunAt, euAiActIngestion.lastRunAt, retrieval.lastRunAt]
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;
  const showEuAiActIngestion = euAiActIngestion.status === "in-progress"
    || (gdprIngestion.status !== "in-progress"
      && Boolean(euAiActIngestion.lastRunAt)
      && (!gdprIngestion.lastRunAt || euAiActIngestion.lastRunAt! >= gdprIngestion.lastRunAt));
  const latestIngestion = showEuAiActIngestion ? euAiActIngestion : gdprIngestion;

  return (
    <div className="app-shell">
      <Header theme={theme} onThemeToggle={toggleTheme} activityActive={screen === "activity"} onActivityLog={() => navigate("activity")} onHome={() => navigate("workflow")} onTrustUsage={() => {
        setPendingRetrievalRequest(null);
        setTrustUsageOpen(true);
      }} />
      {screen === "activity" ? <ActivityLogPage onBack={() => navigate("workflow")} /> : <main className="page-container" id="main-content" tabIndex={-1}>
        <WorkflowHero
          healthStatus={health.status}
          readinessStatus={readiness.status}
          onHealthCheck={runHealth}
          onReadinessCheck={runReadiness}
          gdprScrapeStatus={gdprScrape.status}
          onGdprScrape={() => setGdprConfirmationOpen(true)}
          gdprIngestionStatus={gdprIngestion.status}
          onGdprIngestion={() => setGdprIngestionConfirmationOpen(true)}
          euAiActScrapeStatus={euAiActScrape.status}
          onEuAiActScrape={() => setEuAiActConfirmationOpen(true)}
          euAiActIngestionStatus={euAiActIngestion.status}
          onEuAiActIngestion={() => setEuAiActIngestionConfirmationOpen(true)}
          retrievalStatus={retrieval.status}
          onOpenRetrieval={(requirement = "") => {
            setRetrievalRequirement(requirement);
            setRetrievalOpen(true);
          }}
        />
        {retrievalOpen ? (
          <RetrievalPanel
            initialRequirement={retrievalRequirement}
            retrieval={retrieval}
            loadingMessage={loadingMessage}
            onSubmit={(request) => {
              if (!trustUsageAccepted) {
                setPendingRetrievalRequest(request);
                setTrustUsageOpen(true);
                return;
              }
              setLastRetrievalRequest(request);
              void runRetrieval(request);
            }}
            onClose={() => setRetrievalOpen(false)}
          />
        ) : null}
        <WorkflowBoard steps={steps} detailsByStep={detailsByStep} />
        <WorkflowSummary steps={steps} lastRunAt={lastRunAt} />

        <div className="dashboard-grid">
          <IngestionSummary
            ingestion={latestIngestion.data}
            status={latestIngestion.status}
            standard={showEuAiActIngestion ? "EU AI Act" : "GDPR"}
          />
          <KnowledgeBaseStatus
            gdprScrape={gdprScrape.data}
            gdprIngestion={gdprIngestion.data}
            gdprIngestionStatus={gdprIngestion.status}
            euAiActScrape={euAiActScrape.data}
            euAiActIngestion={euAiActIngestion.data}
            euAiActIngestionStatus={euAiActIngestion.status}
          />
        </div>
      </main>}
      <ToastRegion toasts={toasts} onDismiss={dismissToast} />
      <TrustUsageDialog
        open={trustUsageOpen}
        accepted={trustUsageAccepted}
        blocksRetrieval={Boolean(pendingRetrievalRequest)}
        onClose={() => {
          setTrustUsageOpen(false);
          setPendingRetrievalRequest(null);
        }}
        onAccept={() => {
          acceptTrustUsage();
          setTrustUsageOpen(false);
          if (pendingRetrievalRequest) {
            setLastRetrievalRequest(pendingRetrievalRequest);
            void runRetrieval(pendingRetrievalRequest);
          }
          setPendingRetrievalRequest(null);
        }}
      />
      <ConfirmationDialog
        open={gdprConfirmationOpen}
        title="Refresh GDPR legal source?"
        description="This will retrieve the latest configured GDPR source and replace the current staging snapshot."
        confirmLabel="Start Scrape"
        onCancel={() => setGdprConfirmationOpen(false)}
        onConfirm={() => {
          setGdprConfirmationOpen(false);
          void runGdprScrape();
        }}
      />
      <ConfirmationDialog
        open={euAiActConfirmationOpen}
        title="Refresh EU AI Act legal source?"
        description="This will retrieve the latest configured EU AI Act source and replace the current staging snapshot."
        confirmLabel="Start Scrape"
        onCancel={() => setEuAiActConfirmationOpen(false)}
        onConfirm={() => {
          setEuAiActConfirmationOpen(false);
          void runEuAiActScrape();
        }}
      />
      <ConfirmationDialog
        open={euAiActIngestionConfirmationOpen}
        title="Start EU AI Act ingestion?"
        description={euAiActScrape.status === "completed"
          ? "This will generate embeddings for the staged EU AI Act clauses and update the MongoDB Atlas vector index."
          : "EU AI Act ingestion requires a valid staged EU AI Act snapshot. Continue using the existing backend staging snapshot?"}
        confirmLabel={euAiActScrape.status === "completed" ? "Start Ingestion" : "Continue"}
        onCancel={() => setEuAiActIngestionConfirmationOpen(false)}
        onConfirm={() => {
          setEuAiActIngestionConfirmationOpen(false);
          void runEuAiActIngestion();
        }}
      />
      <ConfirmationDialog
        open={gdprIngestionConfirmationOpen}
        title="Start GDPR ingestion?"
        description={gdprScrape.status === "completed"
          ? "This will generate embeddings for the staged GDPR clauses and update the MongoDB Atlas vector index."
          : "GDPR ingestion requires a valid staged GDPR snapshot. Continue using the existing backend staging snapshot?"}
        confirmLabel={gdprScrape.status === "completed" ? "Start Ingestion" : "Continue"}
        onCancel={() => setGdprIngestionConfirmationOpen(false)}
        onConfirm={() => {
          setGdprIngestionConfirmationOpen(false);
          void runGdprIngestion();
        }}
      />
    </div>
  );
};
