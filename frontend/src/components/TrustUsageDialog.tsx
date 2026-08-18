import { useEffect, useRef, useState } from "react";

interface TrustUsageDialogProps {
  open: boolean;
  accepted: boolean;
  blocksRetrieval: boolean;
  onAccept: () => void;
  onClose: () => void;
}

const terms = [
  "AI-assisted output is not legal advice.",
  "Human review is required for regulatory interpretation.",
  "Indicative retrieval coverage is not compliance certification.",
  "Activity may be logged for security and auditability.",
  "Do not enter credentials, secrets, or unnecessary sensitive data.",
];

export const TrustUsageDialog = ({
  open,
  accepted,
  blocksRetrieval,
  onAccept,
  onClose,
}: TrustUsageDialogProps) => {
  const [acknowledged, setAcknowledged] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    setAcknowledged(false);
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => closeButton.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialog.current) return;
      const focusable = [...dialog.current.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled])")];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div
        className="trust-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="trust-usage-title"
        aria-describedby="trust-usage-intro"
        ref={dialog}
      >
        <div className="trust-dialog__topline">
          <span className="trust-dialog__icon" aria-hidden="true">✓</span>
          <button type="button" onClick={onClose} ref={closeButton} aria-label="Close Trust & Usage">×</button>
        </div>
        <span className="section-eyebrow">Responsible use</span>
        <h2 id="trust-usage-title">Trust &amp; Usage</h2>
        <p id="trust-usage-intro">
          Compliance Hub retrieves regulatory evidence to support internal review. It does not make legal determinations.
        </p>
        <ul>
          {terms.map((term) => <li key={term}>{term}</li>)}
        </ul>

        {accepted ? (
          <div className="trust-dialog__accepted" role="status">
            <strong>Acknowledged on this device</strong>
            <span>You can review these boundaries at any time from Help.</span>
          </div>
        ) : (
          <label className="trust-dialog__acknowledgment">
            <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />
            <span>I understand these limitations and will use the output with appropriate human review.</span>
          </label>
        )}

        <div className="trust-dialog__actions">
          {blocksRetrieval && !accepted ? <span>Your retrieval request will continue after acknowledgment.</span> : <span />}
          {accepted ? (
            <button className="button button--primary" type="button" onClick={onClose}>Close</button>
          ) : (
            <button className="button button--primary" type="button" disabled={!acknowledged} onClick={onAccept}>
              Acknowledge and Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
