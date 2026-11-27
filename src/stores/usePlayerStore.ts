import { create } from "zustand";
import { backendApi, isTauriRuntime } from "../api/backend";
import type { AudioDeviceInfo, RepeatMode, TrackRecord, VisualizerStyle } from "../types/music";
import type { OnlineTrack } from "../types/providers";

export type QueuedTrack = TrackRecord & {
  onlineMeta?: OnlineTrack;
};

export type PlaybackStatus = "idle" | "playing" | "paused" | "ended" | "error";

export interface PlaybackToastMessage {
  title: string;
  subtitle: string;
  tone: "accent" | "warn";
}

interface PlaybackPrefs {
  notificationsEnabled: boolean;
  visualizerStyle: VisualizerStyle;
  lowPerformanceVisualizer: boolean;
  selectedAudioDevice: string | null;
}

const PREFS_KEY = "auraliq.playbackPrefs.v1";

function readPrefs(): PlaybackPrefs {
  const defaults: PlaybackPrefs = {
    notificationsEnabled: true,
    visualizerStyle: "bars",
    lowPerformanceVisualizer: false,
    selectedAudioDevice: null,
  };
  try {
    if (typeof localStorage === "undefined") {
      return defaults;
    }
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) {
      return defaults;
    }
    const parsed = JSON.parse(raw) as Partial<PlaybackPrefs>;
    return {
      notificationsEnabled:
        typeof parsed.notificationsEnabled === "boolean" ? parsed.notificationsEnabled : true,
      visualizerStyle:
        parsed.visualizerStyle === "scope" || parsed.visualizerStyle === "cassette"
          ? parsed.visualizerStyle
          : "bars",
      lowPerformanceVisualizer: Boolean(parsed.lowPerformanceVisualizer),
      selectedAudioDevice:
        typeof parsed.selectedAudioDevice === "string" ? parsed.selectedAudioDevice : null,
    };
  } catch {
    return defaults;
  }
}

function writePrefs(prefs: PlaybackPrefs): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    }
  } catch {
    // Ignore storage errors
  }
}

export interface PlayerStore extends PlaybackPrefs {
  queue: QueuedTrack[];
  queueIndex: number;
  currentTrack: QueuedTrack | null;
  status: PlaybackStatus;
  positionMs: number;
  durationMs: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeatMode: RepeatMode;
  error: string | null;
  audioDevices: AudioDeviceInfo[];
  toastMessage: PlaybackToastMessage | null;
  hydrate: (tracks: TrackRecord[]) => Promise<void>;
  playTrackList: (tracks: TrackRecord[], startIndex?: number) => Promise<void>;
  playOnlineTrackList: (tracks: OnlineTrack[], startIndex?: number) => Promise<void>;
  playQueueIndex: (index: number) => Promise<void>;
  addToQueue: (track: TrackRecord) => void;
  addOnlineToQueue: (track: OnlineTrack) => void;
  playNext: (track: TrackRecord) => void;
  moveQueueItem: (fromIndex: number, toIndex: number) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => Promise<void>;
  togglePlayPause: () => Promise<void>;
  stopPlayback: () => Promise<void>;
  retryCurrentTrack: () => Promise<void>;
  nextTrack: () => Promise<void>;
  prevTrack: () => Promise<void>;
  seek: (positionMs: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  toggleMute: () => Promise<void>;
  toggleShuffle: () => void;
  cycleRepeatMode: () => void;
  pollStatus: () => Promise<void>;
  refreshAudioDevices: () => Promise<void>;
  selectAudioDevice: (deviceName: string | null) => Promise<void>;
  setNotificationsEnabled: (enabled: boolean) => void;
  setVisualizerStyle: (style: VisualizerStyle) => void;
  setLowPerformanceVisualizer: (enabled: boolean) => void;
  dismissToast: () => void;
  persistState: () => void;
}

function normalizeStatus(status: string): PlaybackStatus {
  if (status === "playing" || status === "paused" || status === "ended" || status === "error") {
    return status;
  }
  return "idle";
}

function pickPrefs(s: PlayerStore): PlaybackPrefs {
  return {
    notificationsEnabled: s.notificationsEnabled,
    visualizerStyle: s.visualizerStyle,
    lowPerformanceVisualizer: s.lowPerformanceVisualizer,
    selectedAudioDevice: s.selectedAudioDevice,
  };
}

function onlineToQueuedTrack(track: OnlineTrack, idx: number): QueuedTrack {
  return {
    id: -(idx + 1),
    source_provider: track.provider_id,
    file_path: track.stream_url ?? track.external_id,
    title: track.title,
    artist: track.artist,
    album: track.album,
    album_artist: track.artist,
    genre: track.provider_id,
    duration_ms: track.duration_ms,
    track_number: null,
    disc_number: null,
    release_year: null,
    format: "stream",
    bitrate_kbps: null,
    sample_rate_hz: null,
    artwork_path: track.artwork_url,
    file_size: 0,
    modified_at: 0,
    is_missing: false,
    play_count: 0,
    last_played_at: null,
    is_favorite: false,
    added_at: 0,
    onlineMeta: track,
  };
}

const initialPrefs = readPrefs();

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  ...initialPrefs,
  queue: [],
  queueIndex: -1,
  currentTrack: null,
  status: "idle",
  positionMs: 0,
  durationMs: 0,
  volume: 0.8,
  muted: false,
  shuffle: false,
  repeatMode: "off",
  error: null,
  audioDevices: [],
  toastMessage: null,

  persistState: () => {
    if (!isTauriRuntime()) {
      return;
    }
    const s = get();
    const localQueueIds = s.queue.filter((t) => t.id > 0).map((t) => t.id);
    const localCurrentId = s.currentTrack && s.currentTrack.id > 0 ? s.currentTrack.id : null;
    void backendApi.savePlaybackState({
      current_track_id: localCurrentId,
      position_ms: localCurrentId ? s.positionMs : 0,
      volume: s.volume,
      muted: s.muted,
      shuffle: s.shuffle,
      repeat_mode: s.repeatMode,
      queue_track_ids: localQueueIds,
      queue_index: localCurrentId ? s.queueIndex : -1,
    });
  },

  hydrate: async (tracks) => {
    if (!isTauriRuntime()) {
      return;
    }
    try {
      const saved = await backendApi.loadPlaybackState();
      const byId = new Map(tracks.map((t) => [t.id, t]));
      const queue = saved.queue_track_ids
        .map((id) => byId.get(id))
        .filter((t): t is TrackRecord => Boolean(t));
      const queueIndex =
        saved.queue_index >= 0 && saved.queue_index < queue.length ? saved.queue_index : -1;
      const currentTrack =
        queueIndex >= 0
          ? queue[queueIndex]
          : saved.current_track_id
            ? (byId.get(saved.current_track_id) ?? null)
            : null;
      const repeatMode: RepeatMode =
        saved.repeat_mode === "all" || saved.repeat_mode === "one" ? saved.repeat_mode : "off";

      await backendApi.setVolume(saved.volume);
      await backendApi.setMuted(saved.muted);

      const preferredDev = get().selectedAudioDevice;
      if (preferredDev) {
        await backendApi.setAudioDevice(preferredDev);
      }

      set({
        queue,
        queueIndex,
        currentTrack,
        positionMs: saved.position_ms,
        durationMs: currentTrack?.duration_ms ?? 0,
        volume: saved.volume,
        muted: saved.muted,
        shuffle: saved.shuffle,
        repeatMode,
        status: currentTrack ? "paused" : "idle",
      });
    } catch {
      // Ignore hydration errors on fresh DB
    }
  },

  playTrackList: async (tracks, startIndex = 0) => {
    if (tracks.length === 0) {
      return;
    }
    const idx = Math.max(0, Math.min(startIndex, tracks.length - 1));
    const target = tracks[idx];
    const notify = get().notificationsEnabled;
    set({
      queue: [...tracks],
      queueIndex: idx,
      currentTrack: target,
      positionMs: 0,
      durationMs: target.duration_ms,
      status: "playing",
      error: null,
      toastMessage: notify
        ? { title: target.title, subtitle: `${target.artist} • ${target.album}`, tone: "accent" }
        : null,
    });
    if (isTauriRuntime()) {
      try {
        await backendApi.playTrack(target.id, 0);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        set({
          status: "error",
          error: msg,
          toastMessage: { title: "Playback Error", subtitle: msg, tone: "warn" },
        });
      }
    }
    get().persistState();
  },

  playOnlineTrackList: async (tracks, startIndex = 0) => {
    if (tracks.length === 0) {
      return;
    }
    const queued = tracks.map((t, i) => onlineToQueuedTrack(t, i));
    const idx = Math.max(0, Math.min(startIndex, queued.length - 1));
    const target = queued[idx];
    const notify = get().notificationsEnabled;
    set({
      queue: queued,
      queueIndex: idx,
      currentTrack: target,
      positionMs: 0,
      durationMs: target.duration_ms,
      status: "playing",
      error: null,
      toastMessage: notify
        ? { title: target.title, subtitle: `${target.artist} • ${target.album}`, tone: "accent" }
        : null,
    });
    if (isTauriRuntime() && target.onlineMeta) {
      try {
        await backendApi.resolveAndPlayOnlineTrack(target.onlineMeta);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        set({
          status: "error",
          error: msg,
          toastMessage: { title: "Stream Error", subtitle: msg, tone: "warn" },
        });
      }
    }
  },

  playQueueIndex: async (index) => {
    const { queue, notificationsEnabled } = get();
    if (index < 0 || index >= queue.length) {
      return;
    }
    const target = queue[index];
    set({
      queueIndex: index,
      currentTrack: target,
      positionMs: 0,
      durationMs: target.duration_ms,
      status: "playing",
      error: null,
      toastMessage: notificationsEnabled
        ? { title: target.title, subtitle: `${target.artist} • ${target.album}`, tone: "accent" }
        : null,
    });
    if (isTauriRuntime()) {
      try {
        if (target.onlineMeta) {
          await backendApi.resolveAndPlayOnlineTrack(target.onlineMeta);
        } else {
          await backendApi.playTrack(target.id, 0);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        set({
          status: "error",
          error: msg,
          toastMessage: { title: "Playback Error", subtitle: msg, tone: "warn" },
        });
      }
    }
    get().persistState();
  },

  addToQueue: (track) => {
    set((state) => ({ queue: [...state.queue, track] }));
    get().persistState();
  },

  addOnlineToQueue: (track) => {
    set((state) => ({
      queue: [...state.queue, onlineToQueuedTrack(track, state.queue.length + 1000)],
    }));
  },

  playNext: (track) => {
    set((state) => {
      const nextQueue = [...state.queue];
      const insertAt = state.queueIndex >= 0 ? state.queueIndex + 1 : 0;
      nextQueue.splice(insertAt, 0, track);
      return { queue: nextQueue };
    });
    get().persistState();
  },

  moveQueueItem: (fromIndex, toIndex) => {
    set((state) => {
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= state.queue.length ||
        toIndex >= state.queue.length ||
        fromIndex === toIndex
      ) {
        return state;
      }
      const nextQueue = [...state.queue];
      const [moved] = nextQueue.splice(fromIndex, 1);
      nextQueue.splice(toIndex, 0, moved);

      let nextQueueIndex = state.queueIndex;
      if (state.queueIndex === fromIndex) {
        nextQueueIndex = toIndex;
      } else if (fromIndex < state.queueIndex && toIndex >= state.queueIndex) {
        nextQueueIndex -= 1;
      } else if (fromIndex > state.queueIndex && toIndex <= state.queueIndex) {
        nextQueueIndex += 1;
      }
      return { queue: nextQueue, queueIndex: nextQueueIndex };
    });
    get().persistState();
  },

  removeFromQueue: (index) => {
    set((state) => {
      if (index < 0 || index >= state.queue.length) {
        return state;
      }
      const nextQueue = [...state.queue];
      nextQueue.splice(index, 1);
      let nextIdx = state.queueIndex;
      if (index < state.queueIndex) {
        nextIdx -= 1;
      } else if (index === state.queueIndex) {
        nextIdx = nextQueue.length > 0 ? Math.min(index, nextQueue.length - 1) : -1;
      }
      return {
        queue: nextQueue,
        queueIndex: nextIdx,
        currentTrack: nextIdx >= 0 ? nextQueue[nextIdx] : null,
      };
    });
    get().persistState();
  },

  clearQueue: async () => {
    if (isTauriRuntime()) {
      await backendApi.stopPlayback();
    }
    set({
      queue: [],
      queueIndex: -1,
      currentTrack: null,
      status: "idle",
      positionMs: 0,
      durationMs: 0,
      error: null,
    });
    get().persistState();
  },

  togglePlayPause: async () => {
    const { currentTrack, status, positionMs } = get();
    if (!currentTrack) {
      return;
    }
    if (status === "playing") {
      if (isTauriRuntime()) {
        await backendApi.pausePlayback();
      }
      set({ status: "paused" });
      get().persistState();
      return;
    }
    if (isTauriRuntime()) {
      const snap = await backendApi.getPlaybackStatus();
      if (snap.status === "paused") {
        await backendApi.resumePlayback();
      } else if (currentTrack.onlineMeta) {
        await backendApi.resolveAndPlayOnlineTrack(currentTrack.onlineMeta);
      } else {
        await backendApi.playTrack(currentTrack.id, positionMs);
      }
    }
    set({ status: "playing", error: null });
  },

  stopPlayback: async () => {
    if (isTauriRuntime()) {
      await backendApi.stopPlayback();
    }
    set({ status: "idle", positionMs: 0, error: null });
    get().persistState();
  },

  retryCurrentTrack: async () => {
    const { currentTrack, positionMs } = get();
    if (!currentTrack) {
      return;
    }
    set({ status: "playing", error: null, toastMessage: null });
    if (isTauriRuntime()) {
      try {
        if (currentTrack.onlineMeta) {
          await backendApi.resolveAndPlayOnlineTrack(currentTrack.onlineMeta);
        } else {
          await backendApi.playTrack(currentTrack.id, positionMs);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        set({
          status: "error",
          error: msg,
          toastMessage: { title: "Playback Error", subtitle: msg, tone: "warn" },
        });
      }
    }
  },

  nextTrack: async () => {
    const { queue, queueIndex, shuffle, repeatMode } = get();
    if (queue.length === 0) {
      return;
    }
    if (repeatMode === "one" && queueIndex >= 0) {
      await get().playQueueIndex(queueIndex);
      return;
    }
    let nextIdx: number;
    if (shuffle && queue.length > 1) {
      do {
        nextIdx = Math.floor(Math.random() * queue.length);
      } while (nextIdx === queueIndex);
    } else {
      nextIdx = queueIndex + 1;
    }

    if (nextIdx >= queue.length) {
      if (repeatMode === "all") {
        nextIdx = 0;
      } else {
        if (isTauriRuntime()) {
          await backendApi.stopPlayback();
        }
        set({ status: "idle", positionMs: 0 });
        return;
      }
    }
    await get().playQueueIndex(nextIdx);
  },

  prevTrack: async () => {
    const { queue, queueIndex, positionMs } = get();
    if (queue.length === 0) {
      return;
    }
    if (positionMs > 3000) {
      await get().seek(0);
      return;
    }
    const prevIdx = queueIndex > 0 ? queueIndex - 1 : 0;
    await get().playQueueIndex(prevIdx);
  },

  seek: async (positionMs) => {
    const clamped = Math.max(0, positionMs);
    set({ positionMs: clamped });
    if (isTauriRuntime()) {
      await backendApi.seekPlayback(clamped);
    }
  },

  setVolume: async (volume) => {
    const clamped = Math.max(0, Math.min(1, volume));
    set({ volume: clamped });
    if (isTauriRuntime()) {
      await backendApi.setVolume(clamped);
    }
    get().persistState();
  },

  toggleMute: async () => {
    const next = !get().muted;
    set({ muted: next });
    if (isTauriRuntime()) {
      await backendApi.setMuted(next);
    }
    get().persistState();
  },

  toggleShuffle: () => {
    set((state) => ({ shuffle: !state.shuffle }));
    get().persistState();
  },

  cycleRepeatMode: () => {
    set((state) => ({
      repeatMode: state.repeatMode === "off" ? "all" : state.repeatMode === "all" ? "one" : "off",
    }));
    get().persistState();
  },

  pollStatus: async () => {
    if (!isTauriRuntime()) {
      return;
    }
    try {
      const snap = await backendApi.getPlaybackStatus();
      const nextStatus = normalizeStatus(snap.status);
      const prevError = get().error;
      set({
        status: nextStatus,
        positionMs: snap.position_ms,
        durationMs: snap.duration_ms > 0 ? snap.duration_ms : get().durationMs,
        error: snap.last_error,
        toastMessage:
          snap.last_error && snap.last_error !== prevError
            ? { title: "Audio Device / Playback Error", subtitle: snap.last_error, tone: "warn" }
            : get().toastMessage,
      });
      if (snap.track_ended) {
        await get().nextTrack();
      }
    } catch {
      // Ignore transient poll errors
    }
  },

  refreshAudioDevices: async () => {
    if (!isTauriRuntime()) {
      return;
    }
    try {
      const audioDevices = await backendApi.listAudioDevices();
      set({ audioDevices });
    } catch {
      // Ignore device enumeration errors
    }
  },

  selectAudioDevice: async (selectedAudioDevice) => {
    set((state) => {
      const next = { ...state, selectedAudioDevice };
      writePrefs(pickPrefs(next));
      return { selectedAudioDevice };
    });
    if (isTauriRuntime()) {
      await backendApi.setAudioDevice(selectedAudioDevice);
    }
  },

  setNotificationsEnabled: (notificationsEnabled) => {
    set((state) => {
      const next = { ...state, notificationsEnabled };
      writePrefs(pickPrefs(next));
      return { notificationsEnabled };
    });
  },

  setVisualizerStyle: (visualizerStyle) => {
    set((state) => {
      const next = { ...state, visualizerStyle };
      writePrefs(pickPrefs(next));
      return { visualizerStyle };
    });
  },

  setLowPerformanceVisualizer: (lowPerformanceVisualizer) => {
    set((state) => {
      const next = { ...state, lowPerformanceVisualizer };
      writePrefs(pickPrefs(next));
      return { lowPerformanceVisualizer };
    });
  },

  dismissToast: () => {
    set({ toastMessage: null });
  },
}));
