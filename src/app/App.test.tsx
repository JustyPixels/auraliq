import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { App } from "./App";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("App", () => {
  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders shell, sidebar, home hero, and disabled Milestone 4 player controls", () => {
    render(<App />);

    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Auraliq" })).toBeInTheDocument();
    expect(screen.getByText("Browser Preview")).toBeInTheDocument();

    const playButton = screen.getByRole("button", { name: "Play" });
    expect(playButton).toBeDisabled();
    expect(playButton).toHaveAttribute("title", "Audio engine scheduled for Milestone 4");
  });

  it("navigates across sections and toggles sidebar and right panel", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Local Music" }));
    expect(screen.getByText("Local Music — Scheduled")).toBeInTheDocument();
    expect(screen.getByText("Milestone 4")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Toggle queue panel" }));
    expect(screen.getByText("Playback Queue Empty")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close right panel" }));
    expect(screen.queryByText("Playback Queue Empty")).not.toBeInTheDocument();
  });

  it("switches themes and updates document attributes", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("radio", { name: /Analog Amber/i }));
    expect(document.documentElement.dataset.theme).toBe("analog-amber");
  });

  it("loads app info over Tauri IPC when running in Tauri", async () => {
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    vi.mocked(invoke).mockResolvedValueOnce({
      name: "Auraliq",
      version: "0.1.0",
      platform: "windows",
      arch: "x86_64",
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Tauri IPC Connected")).toBeInTheDocument();
    });
    expect(screen.getByText("windows (x86_64)")).toBeInTheDocument();
    expect(invoke).toHaveBeenCalledWith("get_app_info");
  });
});
