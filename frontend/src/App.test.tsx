import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("UI foundation", () => {
  it("renders the product shell and workspace selector", () => {
    render(<App />);
    expect(screen.getByRole("link", { name: "Compliance Hub home" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Workspace" })).toHaveValue("compliance-operations");
  });

  it("renders the seven-step workflow without fabricated operational data", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Compliance Workflow" })).toBeInTheDocument();
    expect(screen.getAllByText("Not Started")).toHaveLength(7);
    expect(screen.getByText("Knowledge Base Status")).toBeInTheDocument();
    expect(screen.getAllByText("Not run")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Run Health Check" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Check Readiness" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Start GDPR Scrape" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Start GDPR Ingestion" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Start EU AI Act Scrape" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Start EU AI Act Ingestion" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Open Retrieval" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Activity Log" })).toHaveAttribute("title", "View user activity from the last 7 days");
    expect(screen.queryByText("Activity Log")).not.toBeInTheDocument();
  });

  it("switches to dim theme and persists the preference", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Switch to dim theme" }));
    expect(document.documentElement.dataset.theme).toBe("dim");
    expect(localStorage.getItem("compliance-hub-theme")).toBe("dim");
    expect(screen.getByRole("button", { name: "Switch to light theme" })).toBeInTheDocument();
  });
});
