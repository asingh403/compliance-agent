import { QuickActions } from "./QuickActions";
import type { WorkflowStatus } from "../types/workflow";

interface WorkflowHeroProps {
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
  onOpenRetrieval: (requirement?: string) => void;
}

export const WorkflowHero = ({
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
}: WorkflowHeroProps) => (
  <section className="workflow-hero" aria-labelledby="workflow-title">
    <div className="workflow-hero__heading">
      <div>
        <span className="section-eyebrow">Compliance operations</span>
        <h1 id="workflow-title">Compliance Workflow</h1>
        <p>Run and monitor the ingestion and retrieval pipeline for GDPR and EU AI Act.</p>
      </div>
      <div className="future-capability" aria-label="Future capability">
        <span>Test Case Generator</span>
        <strong>Coming next</strong>
      </div>
    </div>
    <QuickActions
      healthStatus={healthStatus}
      readinessStatus={readinessStatus}
      onHealthCheck={onHealthCheck}
      onReadinessCheck={onReadinessCheck}
      gdprScrapeStatus={gdprScrapeStatus}
      onGdprScrape={onGdprScrape}
      gdprIngestionStatus={gdprIngestionStatus}
      onGdprIngestion={onGdprIngestion}
      euAiActScrapeStatus={euAiActScrapeStatus}
      onEuAiActScrape={onEuAiActScrape}
      euAiActIngestionStatus={euAiActIngestionStatus}
      onEuAiActIngestion={onEuAiActIngestion}
      retrievalStatus={retrievalStatus}
      onOpenRetrieval={() => onOpenRetrieval()}
    />
  </section>
);
