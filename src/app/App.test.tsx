import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { useLayoutStore } from "../stores/useLayoutStore";
import { usePlayerStore } from "../stores/usePlayerStore";
import { useShortcutsStore } from "../stores/useShortcutsStore";
import { App } from "./App";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  convertFileSrc: vi.fn((p: string) => p),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
  save: vi.fn(),
}));

describe("App", () => {
  afterEach(async () => {
    delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
    localStorage.clear();
    useLayoutStore.getState().resetLayout();
    useShortcutsStore.getState().resetShortcuts();
    await usePlayerStore.getState().clearQueue();
    vi.clearAllMocks();
  });

  it("renders shell, sidebar, home hero, and disabled Play when no track is loaded", () => {
    render(<App />);

    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Auraliq" })).toBeInTheDocument();
    expect(screen.getByText("Browser Preview")).toBeInTheDocument();

    const playButton = screen.getByRole("button", { name: "Play" });
    expect(playButton).toBeDisabled();
    expect(playButton).toHaveAttribute("title", "Select a track from your library to play");
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
    expect(screen.getByText("Smart Playlists")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Discover" }));
    expect(screen.getByText("Local Discovery")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Your Library" }));
    fireEvent.click(screen.getByRole("tab", { name: "Duplicates" }));
    expect(screen.getByText("No Duplicate Recordings Detected")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Downloads" }));
    expect(screen.getByText("Download Manager Scheduled")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.click(screen.getByRole("tab", { name: "Providers" }));
    expect(screen.getByText("Internet Archive")).toBeInTheDocument();
    expect(screen.getByText("Audius")).toBeInTheDocument();
    expect(screen.getByText("YouTube")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Layout & Sidebar" }));
    expect(screen.getByLabelText("Default Landing Page")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Playback" }));
    expect(screen.getByLabelText("Selected Output Device")).toBeInTheDocument();
  });

  it("toggles sidebar, right panel queue/visualizer, and shortcuts modal", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Toggle queue panel" }));
    expect(screen.getByText("Playback Queue Empty")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Toggle visualizer panel" }));
    expect(screen.getByLabelText("Audio visualizer")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Keyboard shortcuts" }));
    expect(screen.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeInTheDocument();
  });

  it("switches themes from Settings and updates document attributes", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.click(screen.getByRole("radio", { name: /Analog Amber/i }));
    expect(document.documentElement.dataset.theme).toBe("analog-amber");
  });

  it("loads app info and hydrates library over Tauri IPC when running in Tauri", async () => {
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    vi.mocked(invoke).mockImplementation(async (cmd: string) => {
      if (cmd === "get_app_info") {
        return { name: "Auraliq", version: "0.4.0", platform: "windows", arch: "x86_64" };
      }
      if (cmd === "list_providers") {
        return [];
      }
      if (cmd === "load_playback_state") {
        return {
          current_track_id: null,
          position_ms: 0,
          volume: 0.8,
          muted: false,
          shuffle: false,
          repeat_mode: "off",
          queue_track_ids: [],
          queue_index: -1,
        };
      }
      return [];
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Tauri IPC Connected")).toBeInTheDocument();
    });
    expect(screen.getByText("windows (x86_64)")).toBeInTheDocument();
    expect(invoke).toHaveBeenCalledWith("get_app_info");
  });
});
