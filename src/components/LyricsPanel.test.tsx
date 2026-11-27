import { invoke } from "@tauri-apps/api/core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePlayerStore } from "../stores/usePlayerStore";
import { LyricsPanel } from "./LyricsPanel";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  convertFileSrc: vi.fn((p: string) => p),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
  save: vi.fn(),
}));

describe("LyricsPanel", () => {
  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
    usePlayerStore.setState({
      currentTrack: null,
      positionMs: 0,
      lrclibEnabled: false,
    });
    vi.clearAllMocks();
  });

  it("renders opt-in notice when disabled and loads synced lyrics with click-to-seek", async () => {
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    const seekSpy = vi.fn().mockResolvedValue(undefined);

    vi.mocked(invoke).mockImplementation(async (cmd: string) => {
      if (cmd === "get_track_lyrics") {
        if (!usePlayerStore.getState().lrclibEnabled) {
          return {
            source: "disabled",
            instrumental: false,
            plain_lyrics: null,
            synced_lines: [],
            lrclib_enabled: false,
          };
        }
        return {
          source: "lrclib",
          instrumental: false,
          plain_lyrics: "Line one\nLine two",
          synced_lines: [
            { time_ms: 1000, text: "Line one" },
            { time_ms: 5000, text: "Line two" },
          ],
          lrclib_enabled: true,
        };
      }
      if (cmd === "set_lrclib_enabled") {
        return { lrclib_enabled: true, updated_at: 100 };
      }
      return null;
    });

    usePlayerStore.setState({
      currentTrack: {
        id: 1,
        source_provider: "local",
        file_path: "E:\\Music\\test.mp3",
        title: "Test Track",
        artist: "Retro Artist",
        album: "Night Tape",
        album_artist: "Retro Artist",
        genre: "Synthwave",
        duration_ms: 180000,
        track_number: 1,
        disc_number: 1,
        release_year: 2024,
        format: "mp3",
        bitrate_kbps: 320,
        sample_rate_hz: 44100,
        artwork_path: null,
        file_size: 1024,
        modified_at: 100,
        is_missing: false,
        play_count: 0,
        last_played_at: null,
        is_favorite: false,
        added_at: 100,
      },
      positionMs: 5500,
      seek: seekSpy,
    });

    render(<LyricsPanel />);

    await waitFor(() => {
      expect(screen.getByText("Online Lyrics Disabled (Opt-In)")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Enable LRCLIB Lyrics" }));

    await waitFor(() => {
      expect(screen.getByText("Line two")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Line one"));
    expect(seekSpy).toHaveBeenCalledWith(1000);
  });
});
