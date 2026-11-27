import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useLibraryStore } from "../stores/useLibraryStore";
import { usePlayerStore } from "../stores/usePlayerStore";
import { DiscoverPage } from "./DiscoverPage";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
  convertFileSrc: vi.fn((p: string) => p),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
  save: vi.fn(),
}));

describe("DiscoverPage", () => {
  afterEach(async () => {
    useLibraryStore.setState({ tracks: [], genres: [] });
    await usePlayerStore.getState().clearQueue();
  });

  it("shows empty state when no tracks are indexed", () => {
    render(<DiscoverPage />);
    expect(screen.getByText("No Tracks Indexed Yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Shuffle 10 Random" })).toBeDisabled();
  });

  it("renders local discovery panels and shuffles random tracks", () => {
    useLibraryStore.setState({
      tracks: [
        {
          id: 1,
          source_provider: "local",
          file_path: "E:\\Music\\a.flac",
          title: "Neon Pulse",
          artist: "Synth",
          album: "Signals",
          album_artist: "Synth",
          genre: "Synthwave",
          duration_ms: 180_000,
          track_number: 1,
          disc_number: 1,
          release_year: 2026,
          format: "flac",
          bitrate_kbps: 900,
          sample_rate_hz: 44100,
          artwork_path: null,
          file_size: 1000,
          modified_at: 1,
          is_missing: false,
          play_count: 4,
          last_played_at: 10,
          is_favorite: false,
          added_at: 100,
        },
      ],
      genres: [{ name: "Synthwave", track_count: 1 }],
    });

    render(<DiscoverPage />);
    expect(screen.getByText("Recently Added")).toBeInTheDocument();
    expect(screen.getByText("Top Played Locally")).toBeInTheDocument();
    expect(screen.getByText("Synthwave (1)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Shuffle 10 Random" }));
    expect(usePlayerStore.getState().queue).toHaveLength(1);
  });
});
