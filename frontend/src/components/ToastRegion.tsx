import type { ToastMessage } from "../hooks/useToasts";

interface ToastRegionProps {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
}

export const ToastRegion = ({ toasts, onDismiss }: ToastRegionProps) => (
  <div className="toast-region" aria-label="Notifications">
    {toasts.map((toast) => (
      <div className={`toast toast--${toast.tone}`} role={toast.tone === "error" ? "alert" : "status"} aria-atomic="true" key={toast.id}>
        <span className="toast__indicator" aria-hidden="true" />
        <div>
          <strong>{toast.title}</strong>
          <p>{toast.message}</p>
        </div>
        <button type="button" onClick={() => onDismiss(toast.id)} aria-label={`Dismiss ${toast.title} notification`}>
          ×
        </button>
      </div>
    ))}
  </div>
);
