import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { useLayoutStore } from "../stores/useLayoutStore";
import { useShortcutsStore } from "../stores/useShortcutsStore";
import { App } from "./App";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("App", () => {
  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
    localStorage.clear();
    useLayoutStore.getState().resetLayout();
    useShortcutsStore.getState().resetShortcuts();
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

  it("navigates to Search, Playlists, Downloads, and Settings tabs", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(screen.getByLabelText("Search music")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Internet Archive" }));
    expect(screen.getByRole("button", { name: "Internet Archive" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "Playlists" }));
    expect(screen.getByRole("button", { name: "New Playlist" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Downloads" }));
    expect(screen.getByText("Download Manager Scheduled")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.click(screen.getByRole("tab", { name: "Providers" }));
    expect(screen.getByText("Internet Archive")).toBeInTheDocument();
    expect(screen.getByText("YouTube")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Layout & Sidebar" }));
    expect(screen.getByLabelText("Default Landing Page")).toBeInTheDocument();
  });

  it("toggles sidebar, right panel, and shortcuts modal", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Toggle queue panel" }));
    expect(screen.getByText("Playback Queue Empty")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Keyboard shortcuts" }));
    expect(screen.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeInTheDocument();
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
