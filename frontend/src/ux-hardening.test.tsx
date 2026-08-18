import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConfirmationDialog } from "./components/ConfirmationDialog";
import { CopyButton } from "./components/CopyButton";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ToastRegion } from "./components/ToastRegion";
import { useToasts } from "./hooks/useToasts";

describe("UX hardening", () => {
  beforeEach(() => {
    document.body.style.overflow = "";
  });

  it("contains unexpected render failures behind a recovery view", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const BrokenView = () => { throw new Error("render failed"); };
    render(<ErrorBoundary><BrokenView /></ErrorBoundary>);

    expect(screen.getByRole("alert")).toHaveTextContent("Compliance Hub could not display this view");
    expect(screen.getByRole("button", { name: "Reload Workspace" })).toBeInTheDocument();
    consoleError.mockRestore();
  });

  it("traps confirmation focus, handles Escape, and locks background scrolling", () => {
    const onCancel = vi.fn();
    render(
      <ConfirmationDialog
        open
        title="Refresh source?"
        description="Replace the staging snapshot."
        confirmLabel="Start Scrape"
        onCancel={onCancel}
        onConfirm={vi.fn()}
      />,
    );

    const cancel = screen.getByRole("button", { name: "Cancel" });
    const confirm = screen.getByRole("button", { name: "Start Scrape" });
    expect(cancel).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");
    confirm.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(cancel).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("reports successful request-ID copying", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<CopyButton value="request-123" label="Copy Request ID" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy Request ID" }));

    expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith("request-123");
  });

  it("deduplicates identical transient notifications", () => {
    const Harness = () => {
      const { toasts, addToast, dismissToast } = useToasts();
      const notifyTwice = () => {
        addToast({ title: "Saved", message: "Operation completed", tone: "success" });
        addToast({ title: "Saved", message: "Operation completed", tone: "success" });
      };
      return <><button type="button" onClick={notifyTwice}>Notify</button><ToastRegion toasts={toasts} onDismiss={dismissToast} /></>;
    };
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Notify" }));
    expect(screen.getAllByRole("status")).toHaveLength(1);
  });
});
