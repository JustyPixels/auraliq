import { RotateCcw, Sliders } from "lucide-react";
import { DEFAULT_AUDIO_ENHANCEMENTS, usePlayerStore } from "../stores/usePlayerStore";
import { Button } from "./Button";

const EQ_BAND_LABELS = ["60 Hz", "230 Hz", "910 Hz", "3.6 kHz", "14 kHz"] as const;

const EQ_PRESETS: Record<string, [number, number, number, number, number]> = {
  Flat: [0, 0, 0, 0, 0],
  "Bass Boost": [6, 3.5, 0, -1, 0],
  "Retro 90s V": [5, 1.5, -2.5, 2.5, 5],
  Vocal: [-2, 0.5, 4.5, 3, 0.5],
  Treble: [-1, 0, 1, 4, 6],
  "Late Night": [3, 1, 0, 1.5, -2],
};

export function EqualizerPanel() {
  const {
    audioEnhancements,
    lrclibEnabled,
    activeReplayGainDb,
    setAudioEnhancements,
    setLrclibEnabled,
  } = usePlayerStore();

  const update = (patch: Partial<typeof audioEnhancements>) => {
    void setAudioEnhancements({ ...audioEnhancements, ...patch });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="aq-row-wrap" style={{ justifyContent: "space-between" }}>
        <div className="aq-row-wrap">
          <Button
            size="sm"
            variant="secondary"
            active={audioEnhancements.eq_enabled}
            aria-pressed={audioEnhancements.eq_enabled}
            onClick={() => update({ eq_enabled: !audioEnhancements.eq_enabled })}
          >
            <Sliders size={14} />
            5-Band EQ: {audioEnhancements.eq_enabled ? "On" : "Off"}
          </Button>
          {(Object.keys(EQ_PRESETS) as string[]).map((name) => (
            <Button
              key={name}
              size="sm"
              variant="ghost"
              onClick={() => update({ eq_enabled: true, bands_db: EQ_PRESETS[name] })}
            >
              {name}
            </Button>
          ))}
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => void setAudioEnhancements(DEFAULT_AUDIO_ENHANCEMENTS)}
        >
          <RotateCcw size={13} />
          Reset DSP
        </Button>
      </div>

      <div className="aq-kv-item">
        <label htmlFor="aq-eq-preamp" className="aq-kv-label">
          EQ Preamp ({audioEnhancements.preamp_db > 0 ? "+" : ""}
          {audioEnhancements.preamp_db.toFixed(1)} dB)
        </label>
        <input
          id="aq-eq-preamp"
          type="range"
          min={-12}
          max={12}
          step={0.5}
          className="aq-slider"
          value={audioEnhancements.preamp_db}
          onChange={(e) => update({ preamp_db: Number(e.target.value) })}
        />
      </div>

      <div className="aq-grid-2">
        {EQ_BAND_LABELS.map((label, idx) => {
          const val = audioEnhancements.bands_db[idx] ?? 0;
          return (
            <div key={label} className="aq-kv-item">
              <label htmlFor={`aq-eq-band-${idx}`} className="aq-kv-label">
                {label} ({val > 0 ? "+" : ""}
                {val.toFixed(1)} dB)
              </label>
              <input
                id={`aq-eq-band-${idx}`}
                type="range"
                min={-12}
                max={12}
                step={0.5}
                className="aq-slider"
                value={val}
                onChange={(e) => {
                  const next = [...audioEnhancements.bands_db] as [
                    number,
                    number,
                    number,
                    number,
                    number,
                  ];
                  next[idx] = Number(e.target.value);
                  update({ bands_db: next });
                }}
              />
            </div>
          );
        })}
      </div>

      <div className="aq-grid-2">
        <div className="aq-kv-item">
          <span className="aq-kv-label">
            ReplayGain{" "}
            {activeReplayGainDb !== null ? `(Active: ${activeReplayGainDb.toFixed(2)} dB)` : ""}
          </span>
          <div className="aq-row-wrap">
            <Button
              size="sm"
              variant="secondary"
              active={audioEnhancements.replay_gain_enabled}
              aria-pressed={audioEnhancements.replay_gain_enabled}
              onClick={() =>
                update({ replay_gain_enabled: !audioEnhancements.replay_gain_enabled })
              }
            >
              ReplayGain: {audioEnhancements.replay_gain_enabled ? "On" : "Off"}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              active={audioEnhancements.gapless_enabled}
              aria-pressed={audioEnhancements.gapless_enabled}
              onClick={() => update({ gapless_enabled: !audioEnhancements.gapless_enabled })}
            >
              Gapless: {audioEnhancements.gapless_enabled ? "On" : "Off"}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              active={lrclibEnabled}
              aria-pressed={lrclibEnabled}
              onClick={() => void setLrclibEnabled(!lrclibEnabled)}
            >
              Online Lyrics (LRCLIB): {lrclibEnabled ? "On" : "Off"}
            </Button>
          </div>
        </div>

        <div className="aq-kv-item">
          <label htmlFor="aq-crossfade-ms" className="aq-kv-label">
            Crossfade ({(audioEnhancements.crossfade_ms / 1000).toFixed(1)}s)
          </label>
          <input
            id="aq-crossfade-ms"
            type="range"
            min={0}
            max={8000}
            step={500}
            className="aq-slider"
            value={audioEnhancements.crossfade_ms}
            onChange={(e) => update({ crossfade_ms: Number(e.target.value) })}
          />
        </div>
      </div>
    </div>
  );
}
