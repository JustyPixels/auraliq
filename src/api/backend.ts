import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import type {
  AlbumSummary,
  ArtistSummary,
  GenreSummary,
  LibraryFolder,
  PlaybackSnapshot,
  PlaybackStateRecord,
  PlaylistRecord,
  ScanSummary,
  TrackRecord,
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
  loadPlaybackState: () => invoke<PlaybackStateRecord>("load_playback_state"),
  savePlaybackState: (playbackState: PlaybackStateRecord) =>
    invoke<void>("save_playback_state", { playbackState }),
};
