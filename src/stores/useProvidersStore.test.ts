import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PROVIDERS, useProvidersStore } from "./useProvidersStore";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue([]),
  convertFileSrc: vi.fn((p: string) => p),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
  save: vi.fn(),
}));

describe("useProvidersStore", () => {
  beforeEach(() => {
    useProvidersStore.setState({ providers: [...DEFAULT_PROVIDERS], error: null });
  });

  it("enforces strict ToS capability invariants for YouTube, Spotify, and Radio Browser", () => {
    const yt = useProvidersStore.getState().getProvider("youtube");
    expect(yt?.capabilities.download).toBe(false);
    expect(yt?.capabilities.offline_cache_allowed).toBe(false);
    expect(yt?.capabilities.external_playback_only).toBe(true);

    const sp = useProvidersStore.getState().getProvider("spotify");
    expect(sp?.capabilities.download).toBe(false);
    expect(sp?.capabilities.offline_cache_allowed).toBe(false);

    const rb = useProvidersStore.getState().getProvider("radio_browser");
    expect(rb?.capabilities.download).toBe(false);
    expect(rb?.capabilities.offline_cache_allowed).toBe(false);
  });

  it("toggles provider enabled state cleanly", async () => {
    await useProvidersStore.getState().toggleProviderEnabled("audius", false);
    expect(useProvidersStore.getState().getProvider("audius")?.enabled).toBe(false);
  });
});
