import { create } from "zustand";
import { backendApi, isTauriRuntime } from "../api/backend";
import type {
  CacheEntryRecord,
  CacheSettings,
  CacheStats,
  DownloadRecord,
  DownloadSettings,
} from "../types/downloads";
import type { OnlineTrack } from "../types/providers";

interface DownloadsState {
  downloads: DownloadRecord[];
  downloadSettings: DownloadSettings | null;
  cacheStats: CacheStats | null;
  cacheEntries: CacheEntryRecord[];
  loading: boolean;
  error: string | null;

  refreshAll: () => Promise<void>;
  refreshDownloads: () => Promise<void>;
  enqueueDownload: (track: OnlineTrack) => Promise<DownloadRecord | null>;
  pauseDownload: (id: number) => Promise<void>;
  resumeDownload: (id: number) => Promise<void>;
  retryDownload: (id: number) => Promise<void>;
  cancelDownload: (id: number) => Promise<void>;
  removeDownload: (id: number, deleteFile?: boolean) => Promise<void>;
  clearCompleted: () => Promise<void>;
  updateDownloadSettings: (settings: DownloadSettings) => Promise<void>;

  refreshCache: () => Promise<void>;
  updateCacheSettings: (settings: CacheSettings) => Promise<void>;
  clearCache: () => Promise<void>;
  removeCacheEntry: (cacheKey: string) => Promise<void>;
  runCacheCleanup: () => Promise<void>;
}

export const useDownloadsStore = create<DownloadsState>((set, get) => ({
  downloads: [],
  downloadSettings: null,
  cacheStats: null,
  cacheEntries: [],
  loading: false,
  error: null,

  refreshAll: async () => {
    if (!isTauriRuntime()) {
      return;
    }
    set({ loading: true, error: null });
    try {
      const [downloads, downloadSettings, cacheStats, cacheEntries] = await Promise.all([
        backendApi.listDownloads(),
        backendApi.getDownloadSettings(),
        backendApi.getCacheStats(),
        backendApi.listCacheEntries(),
      ]);
      set({ downloads, downloadSettings, cacheStats, cacheEntries, loading: false });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : String(err) });
    }
  },

  refreshDownloads: async () => {
    if (!isTauriRuntime()) {
      return;
    }
    try {
      const downloads = await backendApi.listDownloads();
      set({ downloads, error: null });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },

  enqueueDownload: async (track) => {
    if (!isTauriRuntime()) {
      set({ error: "Downloads require the desktop Tauri runtime." });
      return null;
    }
    try {
      const created = await backendApi.enqueueDownload(track);
      await get().refreshDownloads();
      return created;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
      return null;
    }
  },

  pauseDownload: async (id) => {
    await backendApi.pauseDownload(id);
    await get().refreshDownloads();
  },

  resumeDownload: async (id) => {
    await backendApi.resumeDownload(id);
    await get().refreshDownloads();
  },

  retryDownload: async (id) => {
    await backendApi.retryDownload(id);
    await get().refreshDownloads();
  },

  cancelDownload: async (id) => {
    await backendApi.cancelDownload(id);
    await get().refreshDownloads();
  },

  removeDownload: async (id, deleteFile = false) => {
    await backendApi.removeDownload(id, deleteFile);
    await get().refreshDownloads();
  },

  clearCompleted: async () => {
    await backendApi.clearCompletedDownloads();
    await get().refreshDownloads();
  },

  updateDownloadSettings: async (settings) => {
    const saved = await backendApi.updateDownloadSettings(settings);
    set({ downloadSettings: saved, error: null });
  },

  refreshCache: async () => {
    if (!isTauriRuntime()) {
      return;
    }
    try {
      const [cacheStats, cacheEntries] = await Promise.all([
        backendApi.getCacheStats(),
        backendApi.listCacheEntries(),
      ]);
      set({ cacheStats, cacheEntries, error: null });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },

  updateCacheSettings: async (settings) => {
    const saved = await backendApi.updateCacheSettings(settings);
    const [cacheStats, cacheEntries] = await Promise.all([
      backendApi.getCacheStats(),
      backendApi.listCacheEntries(),
    ]);
    set({
      cacheStats: { ...cacheStats, ...saved },
      cacheEntries,
      error: null,
    });
  },

  clearCache: async () => {
    await backendApi.clearPlaybackCache();
    await get().refreshCache();
  },

  removeCacheEntry: async (cacheKey) => {
    await backendApi.removeCacheEntry(cacheKey);
    await get().refreshCache();
  },

  runCacheCleanup: async () => {
    await backendApi.runCacheCleanup();
    await get().refreshCache();
  },
}));
