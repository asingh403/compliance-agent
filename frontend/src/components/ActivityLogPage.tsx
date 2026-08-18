import { useEffect, useMemo, useState } from "react";
import { getActivity, isApiClientError, type ActivityAction, type ActivityData, type ActivityItem, type ActivityStatus } from "../api";

const actionLabels: Record<ActivityAction, string> = {
  HEALTH_CHECK: "Health Check",
  READINESS_CHECK: "Readiness Check",
  GDPR_SCRAPE: "GDPR Scrape",
  GDPR_INGESTION: "GDPR Ingestion",
  EU_AI_ACT_SCRAPE: "EU AI Act Scrape",
  EU_AI_ACT_INGESTION: "EU AI Act Ingestion",
  COMPLIANCE_RETRIEVAL: "Compliance Retrieval",
  VOICE_TRANSCRIPTION: "Voice Transcription",
};

const actions = Object.keys(actionLabels) as ActivityAction[];
const formatTime = (value: string) => new Intl.DateTimeFormat(undefined, { timeStyle: "medium" }).format(new Date(value));
const dateKey = (value: string) => new Date(value).toDateString();
const dateHeading = (value: string) => {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const prefix = date.toDateString() === today.toDateString()
    ? "Today" : date.toDateString() === yesterday.toDateString() ? "Yesterday" : "";
  const formatted = new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(date);
  return prefix ? `${prefix} — ${formatted}` : formatted;
};
const metadataLabel = (key: string) => key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
const metadataValue = (value: ActivityItem["metadata"][string]) => Array.isArray(value) ? value.join(", ") : String(value ?? "Not available");

interface ActivityLogPageProps { onBack: () => void }

export const ActivityLogPage = ({ onBack }: ActivityLogPageProps) => {
  const [data, setData] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState<ActivityAction | "">("");
  const [status, setStatus] = useState<ActivityStatus | "">("");
  const [page, setPage] = useState(1);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [selected, setSelected] = useState<ActivityItem | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      void getActivity({
        page,
        limit: 20,
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(action ? { action } : {}),
        ...(status ? { status } : {}),
      }, controller.signal).then((result) => setData(result.data)).catch((nextError: unknown) => {
        if (controller.signal.aborted) return;
        setError(isApiClientError(nextError) ? nextError.message : "Activity history could not be loaded.");
      }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, search ? 250 : 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [action, page, refreshVersion, search, status]);

  const groups = useMemo(() => {
    const grouped = new Map<string, ActivityItem[]>();
    for (const item of data?.activities ?? []) {
      const key = dateKey(item.timestamp);
      grouped.set(key, [...(grouped.get(key) ?? []), item]);
    }
    return [...grouped.values()];
  }, [data]);

  const changeFilter = (change: () => void) => { setPage(1); change(); };
  const exportCsv = () => {
    if (!data?.activities.length) return;
    const escape = (value: unknown) => `"${String(value).replace(/"/g, '""')}"`;
    const rows = [["Timestamp", "User", "Action", "Status", "Request ID", "Duration (ms)"],
      ...data.activities.map((item) => [item.timestamp, item.actor.displayName, actionLabels[item.action], item.status, item.requestId, item.durationMs])];
    const url = URL.createObjectURL(new Blob([rows.map((row) => row.map(escape).join(",")).join("\n")], { type: "text/csv" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "activity-last-7-days.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="activity-page page-container" id="main-content" tabIndex={-1}>
      <button className="activity-back" type="button" onClick={onBack}>← Back to Workflow</button>
      <div className="activity-title-row">
        <div><span className="section-eyebrow">Audit history</span><h1>Activity Log</h1><p>Actions performed during the last seven days, newest first.</p></div>
        <div className="activity-title-actions"><button type="button" onClick={() => setRefreshVersion((value) => value + 1)}>↻ Refresh</button><button type="button" onClick={exportCsv} disabled={!data?.activities.length}>Export CSV</button></div>
      </div>

      <section className="activity-summary" aria-label="Activity summary">
        {(["total", "success", "warning", "failed"] as const).map((key) => <div key={key} className={`activity-summary__${key}`}><span>{key === "total" ? "Total actions" : key}</span><strong>{data?.summary[key] ?? 0}</strong></div>)}
      </section>

      <section className="activity-content" aria-label="Last seven days activity">
        <div className="activity-filters">
          <label><span className="sr-only">Search activity</span><input value={search} onChange={(event) => changeFilter(() => setSearch(event.target.value))} placeholder="Search user or request ID…" /></label>
          <label><span className="sr-only">Filter by action</span><select value={action} onChange={(event) => changeFilter(() => setAction(event.target.value as ActivityAction | ""))}><option value="">All actions</option>{actions.map((value) => <option value={value} key={value}>{actionLabels[value]}</option>)}</select></label>
          <label><span className="sr-only">Filter by status</span><select value={status} onChange={(event) => changeFilter(() => setStatus(event.target.value as ActivityStatus | ""))}><option value="">All statuses</option><option value="SUCCESS">Success</option><option value="WARNING">Warning</option><option value="FAILED">Failed</option></select></label>
          <span className="activity-range">Last 7 days</span>
        </div>

        {loading ? <div className="activity-state" role="status"><span className="spinner" aria-hidden="true" /> Loading activity…</div> : null}
        {!loading && error ? <div className="activity-state activity-state--error" role="alert"><strong>Activity unavailable</strong><span>{error}</span><button type="button" onClick={() => setRefreshVersion((value) => value + 1)}>Try again</button></div> : null}
        {!loading && !error && data?.activities.length === 0 ? <div className="activity-state"><strong>No activity found</strong><span>Try changing the filters or run a workflow action.</span></div> : null}
        {!loading && !error ? groups.map((items) => (
          <div className="activity-day" key={dateKey(items[0]!.timestamp)}>
            <h2>{dateHeading(items[0]!.timestamp)}</h2>
            <div className="activity-table" role="table" aria-label={dateHeading(items[0]!.timestamp)}>
              <div className="activity-row activity-row--header" role="row"><span>Time</span><span>User</span><span>Action</span><span>Status</span><span>Duration</span><span aria-hidden="true" /></div>
              {items.map((item) => <button className="activity-row" type="button" key={item.id} onClick={() => setSelected(item)} aria-label={`View ${actionLabels[item.action]} details`}><time>{formatTime(item.timestamp)}</time><span>{item.actor.displayName}</span><strong>{actionLabels[item.action]}</strong><span className={`activity-status activity-status--${item.status.toLowerCase()}`}><i aria-hidden="true" />{item.status.toLowerCase()}</span><span>{item.durationMs < 1_000 ? `${Math.round(item.durationMs)} ms` : `${(item.durationMs / 1_000).toFixed(1)} s`}</span><span aria-hidden="true">›</span></button>)}
            </div>
          </div>
        )) : null}

        {data && data.pagination.total > 0 ? <div className="activity-pagination"><span>Showing {(page - 1) * data.pagination.limit + 1}–{Math.min(page * data.pagination.limit, data.pagination.total)} of {data.pagination.total}</span><div><button type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page} of {data.pagination.pages}</span><button type="button" disabled={page >= data.pagination.pages} onClick={() => setPage((value) => value + 1)}>Next</button></div></div> : null}
      </section>

      {selected ? <div className="activity-drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><aside className="activity-drawer" role="dialog" aria-modal="true" aria-labelledby="activity-detail-title"><button className="activity-drawer__close" type="button" onClick={() => setSelected(null)} aria-label="Close activity details">×</button><span className="section-eyebrow">Activity details</span><h2 id="activity-detail-title">{actionLabels[selected.action]}</h2><span className={`activity-status activity-status--${selected.status.toLowerCase()}`}><i aria-hidden="true" />{selected.status.toLowerCase()}</span><dl><div><dt>User</dt><dd>{selected.actor.displayName}</dd></div><div><dt>Date and time</dt><dd>{new Intl.DateTimeFormat(undefined, { dateStyle: "long", timeStyle: "medium" }).format(new Date(selected.timestamp))}</dd></div><div><dt>Request ID</dt><dd><code>{selected.requestId}</code></dd></div><div><dt>Duration</dt><dd>{selected.durationMs} ms</dd></div>{Object.entries(selected.metadata).map(([key, value]) => <div key={key}><dt>{metadataLabel(key)}</dt><dd>{metadataValue(value)}</dd></div>)}</dl></aside></div> : null}
    </main>
  );
};
