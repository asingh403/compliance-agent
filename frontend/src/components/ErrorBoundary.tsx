import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  failed: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Compliance Hub UI failure", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="fatal-error" role="alert">
        <span className="fatal-error__icon" aria-hidden="true">!</span>
        <h1>Compliance Hub could not display this view</h1>
        <p>Your operation was stopped safely. Reload the workspace to try again.</p>
        <button type="button" onClick={() => window.location.reload()}>Reload Workspace</button>
      </main>
    );
  }
}
