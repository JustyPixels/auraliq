import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrackRecord } from "../types/music";
import { usePlayerStore } from "./usePlayerStore";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
  convertFileSrc: vi.fn((p: string) => p),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
  save: vi.fn(),
}));

function makeTrack(id: number, title: string): TrackRecord {
  return {
    id,
    source_provider: "local",
    file_path: `E:\\Music\\${title}.flac`,
    title,
    artist: "Test Artist",
    album: "Test Album",
    album_artist: "Test Artist",
    genre: "Synthwave",
    duration_ms: 180_000,
    track_number: id,
    disc_number: 1,
    release_year: 2026,
    format: "flac",
    bitrate_kbps: 900,
    sample_rate_hz: 44100,
    artwork_path: null,
    file_size: 1000,
    modified_at: 1,
    is_missing: false,
    play_count: 0,
    last_played_at: null,
    is_favorite: false,
    added_at: 1,
  };
}

describe("usePlayerStore", () => {
  beforeEach(async () => {
    await usePlayerStore.getState().clearQueue();
    usePlayerStore.setState({ shuffle: false, repeatMode: "off", volume: 0.8, muted: false });
  });

  it("plays a track list, advances next/prev, and respects repeat modes", async () => {
    const t1 = makeTrack(1, "Track One");
    const t2 = makeTrack(2, "Track Two");

    await usePlayerStore.getState().playTrackList([t1, t2], 0);
    expect(usePlayerStore.getState().currentTrack?.id).toBe(1);
    expect(usePlayerStore.getState().status).toBe("playing");

    await usePlayerStore.getState().nextTrack();
    expect(usePlayerStore.getState().currentTrack?.id).toBe(2);

    // End of queue with repeatMode="off" stops playback
    await usePlayerStore.getState().nextTrack();
    expect(usePlayerStore.getState().status).toBe("idle");

    // Repeat all wraps to index 0
    usePlayerStore.getState().cycleRepeatMode();
    expect(usePlayerStore.getState().repeatMode).toBe("all");
    await usePlayerStore.getState().playQueueIndex(1);
    await usePlayerStore.getState().nextTrack();
    expect(usePlayerStore.getState().currentTrack?.id).toBe(1);

    // Repeat one stays on current track
    usePlayerStore.getState().cycleRepeatMode();
    expect(usePlayerStore.getState().repeatMode).toBe("one");
    await usePlayerStore.getState().nextTrack();
    expect(usePlayerStore.getState().currentTrack?.id).toBe(1);
  });

  it("manages queue insertion, removal, volume, mute, and clear", async () => {
    const t1 = makeTrack(1, "One");
    const t2 = makeTrack(2, "Two");

    usePlayerStore.getState().addToQueue(t1);
    usePlayerStore.getState().playNext(t2);
    expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual([2, 1]);

    await usePlayerStore.getState().setVolume(0.5);
    expect(usePlayerStore.getState().volume).toBe(0.5);

    await usePlayerStore.getState().toggleMute();
    expect(usePlayerStore.getState().muted).toBe(true);

    usePlayerStore.getState().removeFromQueue(0);
    expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual([1]);

    await usePlayerStore.getState().clearQueue();
    expect(usePlayerStore.getState().queue).toHaveLength(0);
    expect(usePlayerStore.getState().currentTrack).toBeNull();
  });
});
