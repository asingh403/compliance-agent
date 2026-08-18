import type { LegalSourceIngestionData, LegalSourceScrapeData } from "../api";
import type { WorkflowStatus } from "../types/workflow";

interface KnowledgeBaseStatusProps {
  gdprScrape: LegalSourceScrapeData | null;
  gdprIngestion: LegalSourceIngestionData | null;
  gdprIngestionStatus: WorkflowStatus;
  euAiActScrape: LegalSourceScrapeData | null;
  euAiActIngestion: LegalSourceIngestionData | null;
  euAiActIngestionStatus: WorkflowStatus;
}

export const KnowledgeBaseStatus = ({
  gdprScrape,
  gdprIngestion,
  gdprIngestionStatus,
  euAiActScrape,
  euAiActIngestion,
  euAiActIngestionStatus,
}: KnowledgeBaseStatusProps) => {
  const gdprStatus = gdprIngestion
    ? gdprIngestionStatus === "completed-with-warnings" ? "Indexed with warnings" : "Indexed"
    : gdprScrape ? "Staged" : "Not run";
  const euAiActStatus = euAiActIngestion
    ? euAiActIngestionStatus === "completed-with-warnings" ? "Indexed with warnings" : "Indexed"
    : euAiActScrape ? "Staged" : "Not run";
  const standards = [
    {
      name: "GDPR",
      clauses: gdprIngestion ? String(gdprIngestion.total) : gdprScrape ? String(gdprScrape.clauseCount) : "—",
      embedding: gdprIngestion ? `${gdprIngestion.embeddingModel} · 1024D` : "—",
      status: gdprStatus,
    },
    {
      name: "EU AI Act",
      clauses: euAiActIngestion ? String(euAiActIngestion.total) : euAiActScrape ? String(euAiActScrape.clauseCount) : "—",
      embedding: euAiActIngestion ? `${euAiActIngestion.embeddingModel} · 1024D` : "—",
      status: euAiActStatus,
    },
  ];

  return (
    <section className="dashboard-card knowledge-status" aria-labelledby="knowledge-status-title">
      <div className="section-heading section-heading--compact">
        <div>
          <span className="section-eyebrow">Regulatory corpus</span>
          <h2 id="knowledge-status-title">Knowledge Base Status</h2>
        </div>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Standard</th>
              <th scope="col">Source</th>
              <th scope="col">Clauses</th>
              <th scope="col">Embedding</th>
              <th scope="col">Vector Store</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {standards.map((standard) => (
              <tr key={standard.name}>
                <th scope="row">{standard.name}</th>
                <td>EUR-Lex</td>
                <td>{standard.clauses}</td>
                <td>{standard.embedding}</td>
                <td>MongoDB Atlas</td>
                <td><span className="status-badge">{standard.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
