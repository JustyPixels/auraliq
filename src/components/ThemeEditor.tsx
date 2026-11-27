import { Download, RotateCcw, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useLayoutStore } from "../stores/useLayoutStore";
import { usePlayerStore } from "../stores/usePlayerStore";
import { useThemeStore } from "../stores/useThemeStore";
import { getThemeById } from "../themes/applyTheme";
import { TYPOGRAPHY_PRESETS } from "../themes/presets";
import {
  parseThemeBundle,
  serializeThemeBundle,
  THEME_BUNDLE_FORMAT,
} from "../themes/serialization";
import type { CustomThemeColorKey, TypographyPresetId } from "../themes/types";
import type { VisualizerStyle } from "../types/music";
import { Button } from "./Button";

const COLOR_FIELDS: readonly { key: CustomThemeColorKey; label: string }[] = [
  { key: "bg", label: "Background" },
  { key: "surface", label: "Surface" },
  { key: "surfaceElevated", label: "Elevated Surface" },
  { key: "surfaceInset", label: "Inset LCD" },
  { key: "accent", label: "Accent" },
  { key: "secondaryAccent", label: "Secondary" },
  { key: "text", label: "Primary Text" },
  { key: "textMuted", label: "Muted Text" },
  { key: "border", label: "Border" },
  { key: "borderHighlight", label: "Bevel Highlight" },
];

export function ThemeEditor() {
  const {
    themeId,
    reducedMotion,
    overrides,
    typographyPreset,
    bevelStyle,
    scanlinesOpacity,
    customCss,
    customCssEnabled,
    setColorOverride,
    clearColorOverrides,
    setTypographyPreset,
    setBevelStyle,
    setScanlinesOpacity,
    setReducedMotion,
    applyImportedBundle,
    safeResetCustomization,
  } = useThemeStore();

  const { uiDensity, setUiDensity } = useLayoutStore();
  const { visualizerStyle, setVisualizerStyle } = usePlayerStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const activeTheme = getThemeById(themeId);
  const effectiveScanlines = scanlinesOpacity ?? activeTheme.effects.scanlinesOpacity;

  const handleExportTheme = () => {
    const json = serializeThemeBundle({
      format: THEME_BUNDLE_FORMAT,
      exportedAt: new Date().toISOString(),
      themeId,
      reducedMotion,
      overrides,
      typographyPreset,
      bevelStyle,
      scanlinesOpacity,
      customCss,
      customCssEnabled,
      uiDensity,
      visualizerStyle,
    });
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auraliq-theme-${themeId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setImportError(null);
    setImportMessage("Exported theme bundle (.json).");
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    try {
      const raw = await file.text();
      const bundle = parseThemeBundle(raw);
      applyImportedBundle(bundle);
      if (bundle.uiDensity) {
        setUiDensity(bundle.uiDensity);
      }
      if (bundle.visualizerStyle) {
        setVisualizerStyle(bundle.visualizerStyle);
      }
      setImportError(null);
      setImportMessage(`Imported theme "${getThemeById(bundle.themeId).name}".`);
    } catch (err) {
      setImportMessage(null);
      setImportError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
      <div>
        <div
          className="aq-row-wrap"
          style={{ justifyContent: "space-between", marginBottom: "0.55rem" }}
        >
          <span className="aq-kv-label" style={{ margin: 0 }}>
            Color Palette Overrides
          </span>
          <Button
            size="sm"
            variant="ghost"
            disabled={Object.keys(overrides).length === 0}
            onClick={clearColorOverrides}
          >
            <RotateCcw size={13} />
            Reset Colors
          </Button>
        </div>

        <div className="aq-color-grid">
          {COLOR_FIELDS.map(({ key, label }) => {
            const val = overrides[key] || activeTheme.colors[key];
            return (
              <label key={key} className="aq-color-field">
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ fontSize: "0.78rem", fontWeight: 600 }}>{label}</span>
                  <code style={{ fontSize: "0.72rem", color: "var(--aq-muted)" }}>{val}</code>
                </div>
                <input
                  type="color"
                  className="aq-color-swatch-input"
                  aria-label={`${label} color`}
                  value={val}
                  onChange={(e) => setColorOverride(key, e.target.value)}
                />
              </label>
            );
          })}
        </div>
      </div>

      <div className="aq-grid-2">
        <div className="aq-kv-item">
          <span className="aq-kv-label">Typography Preset</span>
          <div className="aq-row-wrap">
            {(Object.keys(TYPOGRAPHY_PRESETS) as TypographyPresetId[]).map((id) => (
              <Button
                key={id}
                size="sm"
                variant="secondary"
                active={typographyPreset === id}
                onClick={() => setTypographyPreset(id)}
              >
                {TYPOGRAPHY_PRESETS[id].label}
              </Button>
            ))}
          </div>
        </div>

        <div className="aq-kv-item">
          <span className="aq-kv-label">Hardware Bevel &amp; Density</span>
          <div className="aq-row-wrap">
            <Button
              size="sm"
              variant="secondary"
              active={bevelStyle === "90s-bevel"}
              onClick={() => setBevelStyle("90s-bevel")}
            >
              90s 3D Bevel
            </Button>
            <Button
              size="sm"
              variant="secondary"
              active={bevelStyle === "flat-pixel"}
              onClick={() => setBevelStyle("flat-pixel")}
            >
              Flat Pixel
            </Button>
            <Button
              size="sm"
              variant="secondary"
              active={uiDensity === "comfortable"}
              onClick={() => setUiDensity("comfortable")}
            >
              Comfortable
            </Button>
            <Button
              size="sm"
              variant="secondary"
              active={uiDensity === "compact"}
              onClick={() => setUiDensity("compact")}
            >
              Compact
            </Button>
          </div>
        </div>
      </div>

      <div className="aq-grid-2">
        <div className="aq-kv-item">
          <label htmlFor="aq-scanlines-range" className="aq-kv-label">
            CRT Scanlines ({Math.round(effectiveScanlines * 100)}%)
          </label>
          <input
            id="aq-scanlines-range"
            type="range"
            min={0}
            max={20}
            step={1}
            className="aq-slider"
            value={Math.round(effectiveScanlines * 100)}
            onChange={(e) => setScanlinesOpacity(Number(e.target.value) / 100)}
          />
        </div>

        <div className="aq-kv-item">
          <span className="aq-kv-label">Visualizer &amp; Motion</span>
          <div className="aq-row-wrap">
            {(
              [
                ["bars", "Retro Bars"],
                ["scope", "CRT Scope"],
                ["cassette", "Cassette"],
                ["vu", "Dual VU"],
                ["crt-matrix", "CRT Matrix"],
              ] as readonly [VisualizerStyle, string][]
            ).map(([id, label]) => (
              <Button
                key={id}
                size="sm"
                variant="secondary"
                active={visualizerStyle === id}
                onClick={() => setVisualizerStyle(id)}
              >
                {label}
              </Button>
            ))}
            <Button
              size="sm"
              variant="secondary"
              active={reducedMotion}
              onClick={() => setReducedMotion(!reducedMotion)}
            >
              Reduced Motion: {reducedMotion ? "On" : "Off"}
            </Button>
          </div>
        </div>
      </div>

      <div className="aq-row-wrap" style={{ justifyContent: "space-between" }}>
        <div className="aq-row-wrap">
          <Button size="sm" variant="secondary" onClick={handleExportTheme}>
            <Download size={14} />
            Export Theme (.json)
          </Button>
          <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()}>
            <Upload size={14} />
            Import Theme (.json)
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: "none" }}
            aria-label="Import theme JSON file"
            onChange={(e) => void handleImportFile(e)}
          />
        </div>

        <Button size="sm" variant="ghost" onClick={safeResetCustomization}>
          <RotateCcw size={14} />
          Safe Reset All
        </Button>
      </div>

      {importMessage && (
        <p role="status" style={{ color: "var(--aq-ok)", margin: 0, fontSize: "0.82rem" }}>
          {importMessage}
        </p>
      )}
      {importError && (
        <p role="alert" style={{ color: "var(--aq-warn)", margin: 0, fontSize: "0.82rem" }}>
          {importError}
        </p>
      )}
    </div>
  );
}
