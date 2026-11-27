import { create } from "zustand";
import {
  backendApi,
  isTauriRuntime,
  pickExportPlaylistFile,
  pickMusicFolder,
  pickPlaylistFile,
} from "../api/backend";
import type {
  AlbumSummary,
  ArtistSummary,
  CollectionRecord,
  DuplicateGroup,
  GenreSummary,
  LibraryFolder,
  PlaylistRecord,
  ScanSummary,
  SmartPlaylistRecord,
  SmartPlaylistRule,
  TrackIdentityLink,
  TrackRecord,
} from "../types/music";

export type LibrarySort = "title" | "artist" | "recent";

export interface LibraryStore {
  folders: LibraryFolder[];
  tracks: TrackRecord[];
  artists: ArtistSummary[];
  albums: AlbumSummary[];
  genres: GenreSummary[];
  recentTracks: TrackRecord[];
  playlists: PlaylistRecord[];
  smartPlaylists: SmartPlaylistRecord[];
  collections: CollectionRecord[];
  duplicateGroups: DuplicateGroup[];
  identityLinks: TrackIdentityLink[];
  sortBy: LibrarySort;
  scanning: boolean;
  lastScan: ScanSummary | null;
  error: string | null;
  setSortBy: (sort: LibrarySort) => Promise<void>;
  refreshLibrary: () => Promise<void>;
  addFolderFromDialog: () => Promise<void>;
  removeFolder: (folderId: number) => Promise<void>;
  scanLibrary: () => Promise<void>;
  toggleFavorite: (trackId: number) => Promise<void>;
  createPlaylist: (name: string) => Promise<PlaylistRecord | null>;
  renamePlaylist: (playlistId: number, name: string) => Promise<void>;
  deletePlaylist: (playlistId: number) => Promise<void>;
  addTrackToPlaylist: (playlistId: number, trackId: number) => Promise<void>;
  removeTrackFromPlaylist: (playlistId: number, trackId: number) => Promise<void>;
  importPlaylistFromDialog: () => Promise<PlaylistRecord | null>;
  exportPlaylistToDialog: (playlist: PlaylistRecord) => Promise<void>;
  createSmartPlaylist: (
    name: string,
    matchMode: string,
    rules: SmartPlaylistRule[],
  ) => Promise<SmartPlaylistRecord | null>;
  deleteSmartPlaylist: (smartId: number) => Promise<void>;
  createCollection: (name: string) => Promise<CollectionRecord | null>;
  deleteCollection: (collectionId: number) => Promise<void>;
  addTrackToCollection: (collectionId: number, trackId: number) => Promise<void>;
  removeTrackFromCollection: (collectionId: number, trackId: number) => Promise<void>;
  setIdentityLinkStatus: (
    trackAId: number,
    trackBId: number,
    status: "confirmed" | "dismissed",
  ) => Promise<void>;
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export const useLibraryStore = create<LibraryStore>((set, get) => ({
  folders: [],
  tracks: [],
  artists: [],
  albums: [],
  genres: [],
  recentTracks: [],
  playlists: [],
  smartPlaylists: [],
  collections: [],
  duplicateGroups: [],
  identityLinks: [],
  sortBy: "title",
  scanning: false,
  lastScan: null,
  error: null,

  setSortBy: async (sortBy) => {
    set({ sortBy });
    if (!isTauriRuntime()) {
      return;
    }
    try {
      const tracks = await backendApi.listTracks(false, sortBy);
      set({ tracks, error: null });
    } catch (err) {
      set({ error: errMsg(err) });
    }
  },

  refreshLibrary: async () => {
    if (!isTauriRuntime()) {
      return;
    }
    try {
      const sort = get().sortBy;
      const [
        folders,
        tracks,
        artists,
        albums,
        genres,
        recentTracks,
        playlists,
        smartPlaylists,
        collections,
        duplicateGroups,
        identityLinks,
      ] = await Promise.all([
        backendApi.listFolders(),
        backendApi.listTracks(false, sort),
        backendApi.listArtists(),
        backendApi.listAlbums(),
        backendApi.listGenres(),
        backendApi.listRecentlyPlayed(25),
        backendApi.listPlaylists(),
        backendApi.listSmartPlaylists(),
        backendApi.listCollections(),
        backendApi.findDuplicateTracks(),
        backendApi.listIdentityLinks(),
      ]);
      set({
        folders,
        tracks,
        artists,
        albums,
        genres,
        recentTracks,
        playlists,
        smartPlaylists,
        collections,
        duplicateGroups,
        identityLinks,
        error: null,
      });
    } catch (err) {
      set({ error: errMsg(err) });
    }
  },

  addFolderFromDialog: async () => {
    if (!isTauriRuntime()) {
      return;
    }
    try {
      const selected = await pickMusicFolder();
      if (!selected) {
        return;
      }
      await backendApi.addFolder(selected);
      await get().scanLibrary();
    } catch (err) {
      set({ error: errMsg(err) });
    }
  },

  removeFolder: async (folderId) => {
    if (!isTauriRuntime()) {
      return;
    }
    try {
      await backendApi.removeFolder(folderId);
      await get().refreshLibrary();
    } catch (err) {
      set({ error: errMsg(err) });
    }
  },

  scanLibrary: async () => {
    if (!isTauriRuntime()) {
      return;
    }
    set({ scanning: true, error: null });
    try {
      const lastScan = await backendApi.scanLibrary();
      set({ lastScan, scanning: false });
      await get().refreshLibrary();
    } catch (err) {
      set({ scanning: false, error: errMsg(err) });
    }
  },

  toggleFavorite: async (trackId) => {
    if (!isTauriRuntime()) {
      return;
    }
    try {
      const nextFav = await backendApi.toggleFavorite(trackId);
      set((state) => ({
        tracks: state.tracks.map((t) => (t.id === trackId ? { ...t, is_favorite: nextFav } : t)),
        recentTracks: state.recentTracks.map((t) =>
          t.id === trackId ? { ...t, is_favorite: nextFav } : t,
        ),
      }));
    } catch (err) {
      set({ error: errMsg(err) });
    }
  },

  createPlaylist: async (name) => {
    if (!isTauriRuntime() || !name.trim()) {
      return null;
    }
    try {
      const created = await backendApi.createPlaylist(name.trim());
      await get().refreshLibrary();
      return created;
    } catch (err) {
      set({ error: errMsg(err) });
      return null;
    }
  },

  renamePlaylist: async (playlistId, name) => {
    if (!isTauriRuntime() || !name.trim()) {
      return;
    }
    try {
      await backendApi.renamePlaylist(playlistId, name.trim());
      await get().refreshLibrary();
    } catch (err) {
      set({ error: errMsg(err) });
    }
  },

  deletePlaylist: async (playlistId) => {
    if (!isTauriRuntime()) {
      return;
    }
    try {
      await backendApi.deletePlaylist(playlistId);
      await get().refreshLibrary();
    } catch (err) {
      set({ error: errMsg(err) });
    }
  },

  addTrackToPlaylist: async (playlistId, trackId) => {
    if (!isTauriRuntime()) {
      return;
    }
    try {
      await backendApi.addTrackToPlaylist(playlistId, trackId);
      await get().refreshLibrary();
    } catch (err) {
      set({ error: errMsg(err) });
    }
  },

  removeTrackFromPlaylist: async (playlistId, trackId) => {
    if (!isTauriRuntime()) {
      return;
    }
    try {
      await backendApi.removeTrackFromPlaylist(playlistId, trackId);
      await get().refreshLibrary();
    } catch (err) {
      set({ error: errMsg(err) });
    }
  },

  importPlaylistFromDialog: async () => {
    if (!isTauriRuntime()) {
      return null;
    }
    try {
      const file = await pickPlaylistFile();
      if (!file) {
        return null;
      }
      const pl = await backendApi.importPlaylistFile(file);
      await get().refreshLibrary();
      return pl;
    } catch (err) {
      set({ error: errMsg(err) });
      return null;
    }
  },

  exportPlaylistToDialog: async (playlist) => {
    if (!isTauriRuntime()) {
      return;
    }
    try {
      const target = await pickExportPlaylistFile(playlist.name);
      if (!target) {
        return;
      }
      await backendApi.exportPlaylistFile(playlist.id, target);
    } catch (err) {
      set({ error: errMsg(err) });
    }
  },

  createSmartPlaylist: async (name, matchMode, rules) => {
    if (!isTauriRuntime() || !name.trim()) {
      return null;
    }
    try {
      const created = await backendApi.createSmartPlaylist(name.trim(), matchMode, rules);
      await get().refreshLibrary();
      return created;
    } catch (err) {
      set({ error: errMsg(err) });
      return null;
    }
  },

  deleteSmartPlaylist: async (smartId) => {
    if (!isTauriRuntime()) {
      return;
    }
    try {
      await backendApi.deleteSmartPlaylist(smartId);
      await get().refreshLibrary();
    } catch (err) {
      set({ error: errMsg(err) });
    }
  },

  createCollection: async (name) => {
    if (!isTauriRuntime() || !name.trim()) {
      return null;
    }
    try {
      const created = await backendApi.createCollection(name.trim());
      await get().refreshLibrary();
      return created;
    } catch (err) {
      set({ error: errMsg(err) });
      return null;
    }
  },

  deleteCollection: async (collectionId) => {
    if (!isTauriRuntime()) {
      return;
    }
    try {
      await backendApi.deleteCollection(collectionId);
      await get().refreshLibrary();
    } catch (err) {
      set({ error: errMsg(err) });
    }
  },

  addTrackToCollection: async (collectionId, trackId) => {
    if (!isTauriRuntime()) {
      return;
    }
    try {
      await backendApi.addTrackToCollection(collectionId, trackId);
      await get().refreshLibrary();
    } catch (err) {
      set({ error: errMsg(err) });
    }
  },

  removeTrackFromCollection: async (collectionId, trackId) => {
    if (!isTauriRuntime()) {
      return;
    }
    try {
      await backendApi.removeTrackFromCollection(collectionId, trackId);
      await get().refreshLibrary();
    } catch (err) {
      set({ error: errMsg(err) });
    }
  },

  setIdentityLinkStatus: async (trackAId, trackBId, status) => {
    if (!isTauriRuntime()) {
      return;
    }
    try {
      await backendApi.setIdentityLinkStatus(trackAId, trackBId, status);
      await get().refreshLibrary();
    } catch (err) {
      set({ error: errMsg(err) });
    }
  },
}));
