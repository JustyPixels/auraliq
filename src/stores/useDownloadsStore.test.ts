import { invoke } from "@tauri-apps/api/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDownloadsStore } from "./useDownloadsStore";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  convertFileSrc: vi.fn((p: string) => p),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
  save: vi.fn(),
}));

describe("useDownloadsStore", () => {
  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
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

  it("enqueues permitted downloads and refreshes queue", async () => {
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    const sampleRecord = {
      id: 1,
      provider_id: "internet_archive",
      external_id: "demo-1",
      title: "Retro Tape",
      artist: "Archive",
      album: "Open Audio",
      license: null,
      artwork_url: null,
      source_url: "https://archive.org/download/demo-1/tape.mp3",
      target_path: "E:\\Downloads\\Archive - Retro Tape.mp3",
      status: "queued",
      bytes_downloaded: 0,
      total_bytes: null,
      error_message: null,
      created_at: 100,
      updated_at: 100,
    };

    vi.mocked(invoke).mockImplementation(async (cmd: string) => {
      if (cmd === "enqueue_download") {
        return sampleRecord;
      }
      if (cmd === "list_downloads") {
        return [sampleRecord];
      }
      return null;
    });

    const created = await useDownloadsStore.getState().enqueueDownload({
      provider_id: "internet_archive",
      external_id: "demo-1",
      title: "Retro Tape",
      artist: "Archive",
      album: "Open Audio",
      duration_ms: 120000,
      stream_url: null,
      artwork_url: null,
      external_url: null,
      license: null,
      downloadable: true,
    });

    expect(created?.id).toBe(1);
    expect(useDownloadsStore.getState().downloads).toHaveLength(1);
    expect(invoke).toHaveBeenCalledWith("enqueue_download", expect.any(Object));
  });

  it("updates cache settings including offline mode", async () => {
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    vi.mocked(invoke).mockImplementation(async (cmd: string) => {
      if (cmd === "update_cache_settings") {
        return { enabled: true, max_size_mb: 256, ttl_hours: 48, offline_mode: true };
      }
      if (cmd === "get_cache_stats") {
        return {
          entry_count: 2,
          total_bytes: 1024,
          max_bytes: 256 * 1024 * 1024,
          enabled: true,
          max_size_mb: 256,
          ttl_hours: 48,
          offline_mode: true,
          cache_dir: "E:\\Cache",
        };
      }
      if (cmd === "list_cache_entries") {
        return [];
      }
      return null;
    });

    await useDownloadsStore.getState().updateCacheSettings({
      enabled: true,
      max_size_mb: 256,
      ttl_hours: 48,
      offline_mode: true,
    });

    expect(useDownloadsStore.getState().cacheStats?.offline_mode).toBe(true);
    expect(useDownloadsStore.getState().cacheStats?.max_size_mb).toBe(256);
  });
});
