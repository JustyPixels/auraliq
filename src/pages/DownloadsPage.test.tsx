import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDownloadsStore } from "../stores/useDownloadsStore";
import { DownloadsPage } from "./DownloadsPage";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  convertFileSrc: vi.fn((p: string) => p),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
  save: vi.fn(),
}));

describe("DownloadsPage", () => {
  afterEach(() => {
    useDownloadsStore.setState({
      downloads: [],
      downloadSettings: null,
      cacheStats: null,
      cacheEntries: [],
      loading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  it("renders Download Queue, Temporary Playback Cache, and Download Settings", () => {
    render(<DownloadsPage />);

    expect(screen.getByText("Download Queue")).toBeInTheDocument();
    expect(screen.getByText("Temporary Playback Cache")).toBeInTheDocument();
    expect(screen.getByText("Download Settings & Lofty Auto-Tagging")).toBeInTheDocument();
    expect(screen.getByText("No Downloads Queued")).toBeInTheDocument();
  });

  it("renders queued/paused download items and invokes pause/resume actions", () => {
    const pauseSpy = vi.fn().mockResolvedValue(undefined);
    const resumeSpy = vi.fn().mockResolvedValue(undefined);
    useDownloadsStore.setState({
      downloads: [
        {
          id: 10,
          provider_id: "internet_archive",
          external_id: "ia-10",
          title: "Sunset Tape",
          artist: "Archivist",
          album: "Open Archive",
          license: null,
          artwork_url: null,
          source_url: "https://archive.org/download/ia-10/sunset.mp3",
          target_path: "E:\\Downloads\\Archivist - Sunset Tape.mp3",
          status: "paused",
          bytes_downloaded: 512000,
          total_bytes: 1024000,
          error_message: null,
          created_at: 100,
          updated_at: 100,
        },
      ],
      pauseDownload: pauseSpy,
      resumeDownload: resumeSpy,
    });

    render(<DownloadsPage />);

    expect(screen.getByText("Sunset Tape")).toBeInTheDocument();
    expect(screen.getByText("PAUSED")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Resume Sunset Tape" }));
    expect(resumeSpy).toHaveBeenCalledWith(10);
  });
});
