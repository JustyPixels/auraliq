import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_AUDIO_ENHANCEMENTS, usePlayerStore } from "../stores/usePlayerStore";
import { EqualizerPanel } from "./EqualizerPanel";

describe("EqualizerPanel", () => {
  afterEach(() => {
    usePlayerStore.setState({
      audioEnhancements: DEFAULT_AUDIO_ENHANCEMENTS,
      lrclibEnabled: false,
      activeReplayGainDb: null,
    });
    localStorage.clear();
  });

  it("toggles EQ, applies presets, and updates ReplayGain/Gapless/Crossfade", () => {
    render(<EqualizerPanel />);

    fireEvent.click(screen.getByRole("button", { name: /5-Band EQ: Off/i }));
    expect(usePlayerStore.getState().audioEnhancements.eq_enabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Retro 90s V" }));
    expect(usePlayerStore.getState().audioEnhancements.bands_db).toEqual([5, 1.5, -2.5, 2.5, 5]);

    fireEvent.click(screen.getByRole("button", { name: /ReplayGain: Off/i }));
    expect(usePlayerStore.getState().audioEnhancements.replay_gain_enabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/Crossfade/i), { target: { value: "3000" } });
    expect(usePlayerStore.getState().audioEnhancements.crossfade_ms).toBe(3000);

    fireEvent.click(screen.getByRole("button", { name: "Reset DSP" }));
    expect(usePlayerStore.getState().audioEnhancements).toEqual(DEFAULT_AUDIO_ENHANCEMENTS);
  });
});
