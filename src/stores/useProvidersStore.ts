import { create } from "zustand";
import { backendApi, isTauriRuntime } from "../api/backend";
import type { ProviderInfo } from "../types/providers";

export const DEFAULT_PROVIDERS: readonly ProviderInfo[] = [
  {
    id: "local",
    name: "Local Library",
    tier: "Tier 1 — MVP Core",
    status_label: "Active (M4)",
    description: "Offline local music folders with Symphonia decoding and SQLite FTS5.",
    restriction_note: "WMA is unsupported by Symphonia; all data stays local.",
    enabled: true,
    implemented_for_streaming: true,
    auth_configured: true,
    capabilities: {
      search: true,
      metadata: true,
      stream_playback: true,
      external_playback_only: false,
      playback_control: true,
      playlists: true,
      download: false,
      offline_cache_allowed: false,
      lyrics: false,
      requires_auth: false,
    },
    auth_fields: [],
  },
  {
    id: "internet_archive",
    name: "Internet Archive",
    tier: "Tier 2 — MVP Online",
    status_label: "Framework Ready (M8)",
    description: "Open archival audio catalog with free streaming and permitted downloads.",
    restriction_note: "Respects item licenses and polite API rate limits.",
    enabled: true,
    implemented_for_streaming: false,
    auth_configured: true,
    capabilities: {
      search: true,
      metadata: true,
      stream_playback: true,
      external_playback_only: false,
      playback_control: true,
      playlists: false,
      download: true,
      offline_cache_allowed: true,
      lyrics: false,
      requires_auth: false,
    },
    auth_fields: [],
  },
  {
    id: "audius",
    name: "Audius",
    tier: "Tier 2 — MVP Online",
    status_label: "Framework Ready (M8)",
    description: "Open decentralized music catalog with free 320kbps streaming.",
    restriction_note: "Downloads depend on individual artist track permissions.",
    enabled: true,
    implemented_for_streaming: false,
    auth_configured: true,
    capabilities: {
      search: true,
      metadata: true,
      stream_playback: true,
      external_playback_only: false,
      playback_control: true,
      playlists: true,
      download: false,
      offline_cache_allowed: true,
      lyrics: false,
      requires_auth: false,
    },
    auth_fields: [],
  },
  {
    id: "radio_browser",
    name: "Radio Browser",
    tier: "Tier 2 — MVP Online",
    status_label: "Framework Ready (M8)",
    description: "Community-driven directory of free global internet radio stations.",
    restriction_note: "Live streams only; downloads and offline caching are disabled.",
    enabled: true,
    implemented_for_streaming: false,
    auth_configured: true,
    capabilities: {
      search: true,
      metadata: true,
      stream_playback: true,
      external_playback_only: false,
      playback_control: false,
      playlists: false,
      download: false,
      offline_cache_allowed: false,
      lyrics: false,
      requires_auth: false,
    },
    auth_fields: [],
  },
  {
    id: "direct_url",
    name: "Direct Audio URLs & RSS",
    tier: "Tier 2 — MVP Online",
    status_label: "Framework Ready (M8)",
    description: "User-supplied HTTPS audio stream links and open podcast RSS feeds.",
    restriction_note: "URLs are validated against SSRF and private-IP blocklists.",
    enabled: true,
    implemented_for_streaming: true,
    auth_configured: true,
    capabilities: {
      search: false,
      metadata: true,
      stream_playback: true,
      external_playback_only: false,
      playback_control: true,
      playlists: false,
      download: false,
      offline_cache_allowed: false,
      lyrics: false,
      requires_auth: false,
    },
    auth_fields: [],
  },
  {
    id: "youtube",
    name: "YouTube",
    tier: "Tier 3 — Optional Restricted",
    status_label: "Restricted (Visible Embed)",
    description: "Data API v3 search and visible IFrame Player embed.",
    restriction_note:
      "YouTube ToS strictly prohibits audio ripping, hidden/audio-only play, downloading, and offline caching.",
    enabled: false,
    implemented_for_streaming: false,
    auth_configured: false,
    capabilities: {
      search: true,
      metadata: true,
      stream_playback: false,
      external_playback_only: true,
      playback_control: true,
      playlists: false,
      download: false,
      offline_cache_allowed: false,
      lyrics: false,
      requires_auth: true,
    },
    auth_fields: [{ key: "api_key", label: "YouTube Data API v3 Key", is_secret: true }],
  },
  {
    id: "spotify",
    name: "Spotify",
    tier: "Tier 3 — Optional Restricted",
    status_label: "Restricted (Connect / Metadata)",
    description: "Metadata lookup and Spotify Connect / external player handoff.",
    restriction_note:
      "2026 Spotify Dev Mode requires developer Premium, caps at 5 users, and prohibits downloads or stream extraction.",
    enabled: false,
    implemented_for_streaming: false,
    auth_configured: false,
    capabilities: {
      search: true,
      metadata: true,
      stream_playback: false,
      external_playback_only: true,
      playback_control: true,
      playlists: false,
      download: false,
      offline_cache_allowed: false,
      lyrics: false,
      requires_auth: true,
    },
    auth_fields: [{ key: "client_id", label: "Spotify Client ID", is_secret: true }],
  },
];

export interface ProvidersStore {
  providers: ProviderInfo[];
  loading: boolean;
  error: string | null;
  refreshProviders: () => Promise<void>;
  toggleProviderEnabled: (providerId: string, enabled: boolean) => Promise<void>;
  saveCredential: (providerId: string, field: string, value: string) => Promise<void>;
  clearCredential: (providerId: string, field: string) => Promise<void>;
  getProvider: (providerId: string) => ProviderInfo | undefined;
}

export const useProvidersStore = create<ProvidersStore>((set, get) => ({
  providers: [...DEFAULT_PROVIDERS],
  loading: false,
  error: null,

  refreshProviders: async () => {
    if (!isTauriRuntime()) {
      return;
    }
    set({ loading: true, error: null });
    try {
      const providers = await backendApi.listProviders();
      set({ providers, loading: false });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : String(err) });
    }
  },

  toggleProviderEnabled: async (providerId, enabled) => {
    set((state) => ({
      providers: state.providers.map((p) => (p.id === providerId ? { ...p, enabled } : p)),
    }));
    if (!isTauriRuntime()) {
      return;
    }
    try {
      await backendApi.setProviderEnabled(providerId, enabled);
      await get().refreshProviders();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },

  saveCredential: async (providerId, field, value) => {
    if (!isTauriRuntime()) {
      return;
    }
    try {
      await backendApi.saveProviderCredential(providerId, field, value);
      await get().refreshProviders();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },

  clearCredential: async (providerId, field) => {
    if (!isTauriRuntime()) {
      return;
    }
    try {
      await backendApi.clearProviderCredential(providerId, field);
      await get().refreshProviders();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },

  getProvider: (providerId) => get().providers.find((p) => p.id === providerId),
}));
