import { create } from "zustand";
import { backendApi, isTauriRuntime } from "../api/backend";
import type { RepeatMode, TrackRecord } from "../types/music";

export type PlaybackStatus = "idle" | "playing" | "paused" | "ended" | "error";

export interface PlayerStore {
  queue: TrackRecord[];
  queueIndex: number;
  currentTrack: TrackRecord | null;
  status: PlaybackStatus;
  positionMs: number;
  durationMs: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeatMode: RepeatMode;
  error: string | null;
  hydrate: (tracks: TrackRecord[]) => Promise<void>;
  playTrackList: (tracks: TrackRecord[], startIndex?: number) => Promise<void>;
  playQueueIndex: (index: number) => Promise<void>;
  addToQueue: (track: TrackRecord) => void;
  playNext: (track: TrackRecord) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => Promise<void>;
  togglePlayPause: () => Promise<void>;
  nextTrack: () => Promise<void>;
  prevTrack: () => Promise<void>;
  seek: (positionMs: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  toggleMute: () => Promise<void>;
  toggleShuffle: () => void;
  cycleRepeatMode: () => void;
  pollStatus: () => Promise<void>;
  persistState: () => void;
}

function normalizeStatus(status: string): PlaybackStatus {
  if (status === "playing" || status === "paused" || status === "ended" || status === "error") {
    return status;
  }
  return "idle";
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
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

  persistState: () => {
    if (!isTauriRuntime()) {
      return;
    }
    const s = get();
    void backendApi.savePlaybackState({
      current_track_id: s.currentTrack?.id ?? null,
      position_ms: s.positionMs,
      volume: s.volume,
      muted: s.muted,
      shuffle: s.shuffle,
      repeat_mode: s.repeatMode,
      queue_track_ids: s.queue.map((t) => t.id),
      queue_index: s.queueIndex,
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
    set({
      queue: [...tracks],
      queueIndex: idx,
      currentTrack: target,
      positionMs: 0,
      durationMs: target.duration_ms,
      status: "playing",
      error: null,
    });
    if (isTauriRuntime()) {
      try {
        await backendApi.playTrack(target.id, 0);
      } catch (err) {
        set({ status: "error", error: err instanceof Error ? err.message : String(err) });
      }
    }
    get().persistState();
  },

  playQueueIndex: async (index) => {
    const { queue } = get();
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
    });
    if (isTauriRuntime()) {
      try {
        await backendApi.playTrack(target.id, 0);
      } catch (err) {
        set({ status: "error", error: err instanceof Error ? err.message : String(err) });
      }
    }
    get().persistState();
  },

  addToQueue: (track) => {
    set((state) => ({ queue: [...state.queue, track] }));
    get().persistState();
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
      if (snap.current_path === currentTrack.file_path && snap.status === "paused") {
        await backendApi.resumePlayback();
      } else {
        await backendApi.playTrack(currentTrack.id, positionMs);
      }
    }
    set({ status: "playing", error: null });
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
      set({
        status: nextStatus,
        positionMs: snap.position_ms,
        durationMs: snap.duration_ms > 0 ? snap.duration_ms : get().durationMs,
        error: snap.last_error,
      });
      if (snap.track_ended) {
        await get().nextTrack();
      }
    } catch {
      // Ignore transient poll errors
    }
  },
}));
