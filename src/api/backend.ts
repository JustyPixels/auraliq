import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import type {
  CacheEntryRecord,
  CacheSettings,
  CacheStats,
  DownloadRecord,
  DownloadSettings,
} from "../types/downloads";
import type { OnlineTrack, ProviderInfo, ProviderSearchResult } from "../types/providers";
import type {
  AlbumSummary,
  ArtistSummary,
  AudioDeviceInfo,
  CollectionRecord,
  DuplicateGroup,
  GenreSummary,
  LibraryFolder,
  PlaybackSnapshot,
  PlaybackStateRecord,
  PlaylistRecord,
  ScanSummary,
  SearchFilters,
  SmartPlaylistRecord,
  SmartPlaylistRule,
  TrackIdentityLink,
  TrackRecord,
  VisualizerFrame,
} from "../types/music";

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function resolveArtworkUrl(artworkPath: string | null): string | null {
  if (!artworkPath) {
    return null;
  }
  if (!isTauriRuntime()) {
    return artworkPath;
  }
  return convertFileSrc(artworkPath);
}

export function formatDurationMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export async function pickMusicFolder(): Promise<string | null> {
  const selected = await open({ directory: true, multiple: false, title: "Select Music Folder" });
  return typeof selected === "string" ? selected : null;
}

export async function pickDownloadFolder(): Promise<string | null> {
  const selected = await open({
    directory: true,
    multiple: false,
    title: "Select Download Folder",
  });
  return typeof selected === "string" ? selected : null;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
}

export async function pickPlaylistFile(): Promise<string | null> {
  const selected = await open({
    directory: false,
    multiple: false,
    title: "Import Playlist",
    filters: [{ name: "Playlists", extensions: ["m3u", "m3u8", "pls"] }],
  });
  return typeof selected === "string" ? selected : null;
}

export async function pickExportPlaylistFile(defaultName: string): Promise<string | null> {
  const selected = await save({
    title: "Export Playlist",
    defaultPath: `${defaultName}.m3u8`,
    filters: [
      { name: "M3U8 Playlist", extensions: ["m3u8", "m3u"] },
      { name: "PLS Playlist", extensions: ["pls"] },
    ],
  });
  return selected ?? null;
}

export const backendApi = {
  listFolders: () => invoke<LibraryFolder[]>("list_folders"),
  addFolder: (path: string) => invoke<LibraryFolder>("add_folder", { path }),
  removeFolder: (folderId: number) => invoke<void>("remove_folder", { folderId }),
  scanLibrary: () => invoke<ScanSummary>("scan_library"),
  listTracks: (favoritesOnly = false, sortBy = "title") =>
    invoke<TrackRecord[]>("list_tracks", { favoritesOnly, sortBy }),
  searchTracks: (query: string) => invoke<TrackRecord[]>("search_tracks", { query }),
  listArtists: () => invoke<ArtistSummary[]>("list_artists"),
  listAlbums: () => invoke<AlbumSummary[]>("list_albums"),
  listGenres: () => invoke<GenreSummary[]>("list_genres"),
  toggleFavorite: (trackId: number) => invoke<boolean>("toggle_favorite", { trackId }),
  listRecentlyPlayed: (limit = 50) => invoke<TrackRecord[]>("list_recently_played", { limit }),
  searchTracksFiltered: (filters: SearchFilters) =>
    invoke<TrackRecord[]>("search_tracks_filtered", { filters }),

  listSmartPlaylists: () => invoke<SmartPlaylistRecord[]>("list_smart_playlists"),
  createSmartPlaylist: (name: string, matchMode: string, rules: SmartPlaylistRule[]) =>
    invoke<SmartPlaylistRecord>("create_smart_playlist", { name, matchMode, rules }),
  deleteSmartPlaylist: (smartId: number) => invoke<void>("delete_smart_playlist", { smartId }),
  getSmartPlaylistTracks: (smartId: number) =>
    invoke<TrackRecord[]>("get_smart_playlist_tracks", { smartId }),

  listCollections: () => invoke<CollectionRecord[]>("list_collections"),
  createCollection: (name: string, description = "") =>
    invoke<CollectionRecord>("create_collection", { name, description }),
  deleteCollection: (collectionId: number) => invoke<void>("delete_collection", { collectionId }),
  getCollectionTracks: (collectionId: number) =>
    invoke<TrackRecord[]>("get_collection_tracks", { collectionId }),
  addTrackToCollection: (collectionId: number, trackId: number) =>
    invoke<void>("add_track_to_collection", { collectionId, trackId }),
  removeTrackFromCollection: (collectionId: number, trackId: number) =>
    invoke<void>("remove_track_from_collection", { collectionId, trackId }),

  findDuplicateTracks: () => invoke<DuplicateGroup[]>("find_duplicate_tracks"),
  listIdentityLinks: () => invoke<TrackIdentityLink[]>("list_identity_links"),
  setIdentityLinkStatus: (trackAId: number, trackBId: number, status: "confirmed" | "dismissed") =>
    invoke<void>("set_identity_link_status", { trackAId, trackBId, status }),

  listPlaylists: () => invoke<PlaylistRecord[]>("list_playlists"),
  createPlaylist: (name: string, description = "") =>
    invoke<PlaylistRecord>("create_playlist", { name, description }),
  renamePlaylist: (playlistId: number, name: string) =>
    invoke<void>("rename_playlist", { playlistId, name }),
  deletePlaylist: (playlistId: number) => invoke<void>("delete_playlist", { playlistId }),
  getPlaylistTracks: (playlistId: number) =>
    invoke<TrackRecord[]>("get_playlist_tracks", { playlistId }),
  addTrackToPlaylist: (playlistId: number, trackId: number) =>
    invoke<void>("add_track_to_playlist", { playlistId, trackId }),
  removeTrackFromPlaylist: (playlistId: number, trackId: number) =>
    invoke<void>("remove_track_from_playlist", { playlistId, trackId }),
  importPlaylistFile: (filePath: string) =>
    invoke<PlaylistRecord>("import_playlist_file", { filePath }),
  exportPlaylistFile: (playlistId: number, filePath: string) =>
    invoke<void>("export_playlist_file", { playlistId, filePath }),

  playTrack: (trackId: number, startMs = 0) => invoke<void>("play_track", { trackId, startMs }),
  pausePlayback: () => invoke<void>("pause_playback"),
  resumePlayback: () => invoke<void>("resume_playback"),
  stopPlayback: () => invoke<void>("stop_playback"),
  seekPlayback: (positionMs: number) => invoke<void>("seek_playback", { positionMs }),
  setVolume: (volume: number) => invoke<void>("set_volume", { volume }),
  setMuted: (muted: boolean) => invoke<void>("set_muted", { muted }),
  getPlaybackStatus: () => invoke<PlaybackSnapshot>("get_playback_status"),
  listAudioDevices: () => invoke<AudioDeviceInfo[]>("list_audio_devices"),
  setAudioDevice: (deviceName: string | null) => invoke<void>("set_audio_device", { deviceName }),
  getVisualizerFrame: () => invoke<VisualizerFrame>("get_visualizer_frame"),
  loadPlaybackState: () => invoke<PlaybackStateRecord>("load_playback_state"),
  savePlaybackState: (playbackState: PlaybackStateRecord) =>
    invoke<void>("save_playback_state", { playbackState }),

  listProviders: () => invoke<ProviderInfo[]>("list_providers"),
  setProviderEnabled: (providerId: string, enabled: boolean) =>
    invoke<void>("set_provider_enabled", { providerId, enabled }),
  saveProviderCredential: (providerId: string, field: string, value: string) =>
    invoke<void>("save_provider_credential", { providerId, field, value }),
  clearProviderCredential: (providerId: string, field: string) =>
    invoke<void>("clear_provider_credential", { providerId, field }),
  searchProvider: (providerId: string, query: string, limit = 20) =>
    invoke<ProviderSearchResult>("search_provider", { providerId, query, limit }),
  playOnlineTrack: (
    providerId: string,
    streamUrl: string,
    title: string,
    artist: string,
    album: string,
    durationMs = 0,
  ) =>
    invoke<void>("play_online_track", {
      providerId,
      streamUrl,
      title,
      artist,
      album,
      durationMs,
    }),
  resolveAndPlayOnlineTrack: (track: OnlineTrack) =>
    invoke<string>("resolve_and_play_online_track", { track }),

  listDownloads: () => invoke<DownloadRecord[]>("list_downloads"),
  enqueueDownload: (track: OnlineTrack) => invoke<DownloadRecord>("enqueue_download", { track }),
  pauseDownload: (id: number) => invoke<void>("pause_download", { id }),
  resumeDownload: (id: number) => invoke<void>("resume_download", { id }),
  retryDownload: (id: number) => invoke<void>("retry_download", { id }),
  cancelDownload: (id: number) => invoke<void>("cancel_download", { id }),
  removeDownload: (id: number, deleteFile = false) =>
    invoke<void>("remove_download", { id, deleteFile }),
  clearCompletedDownloads: () => invoke<number>("clear_completed_downloads"),
  getDownloadSettings: () => invoke<DownloadSettings>("get_download_settings"),
  updateDownloadSettings: (settings: DownloadSettings) =>
    invoke<DownloadSettings>("update_download_settings", { settings }),

  getCacheStats: () => invoke<CacheStats>("get_cache_stats"),
  listCacheEntries: () => invoke<CacheEntryRecord[]>("list_cache_entries"),
  updateCacheSettings: (settings: CacheSettings) =>
    invoke<CacheSettings>("update_cache_settings", { settings }),
  clearPlaybackCache: () => invoke<number>("clear_playback_cache"),
  removeCacheEntry: (cacheKey: string) => invoke<void>("remove_cache_entry", { cacheKey }),
  runCacheCleanup: () => invoke<number>("run_cache_cleanup"),
};
