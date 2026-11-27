import { getThemeById } from "./applyTheme";
import { DEFAULT_TYPOGRAPHY_PRESET, TYPOGRAPHY_PRESETS } from "./presets";
import type {
  BevelStyle,
  CustomThemeColorKey,
  CustomThemeOverrides,
  ThemeId,
  TypographyPresetId,
} from "./types";
import { MAX_USER_CSS_LENGTH } from "./userCss";

export const THEME_BUNDLE_FORMAT = "auraliq-theme-v1" as const;

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

const VALID_OVERRIDE_KEYS: readonly CustomThemeColorKey[] = [
  "bg",
  "surface",
  "surfaceElevated",
  "surfaceInset",
  "text",
  "textMuted",
  "accent",
  "secondaryAccent",
  "border",
  "borderHighlight",
];

export interface ThemeExportBundle {
  format: typeof THEME_BUNDLE_FORMAT;
  exportedAt: string;
  themeId: ThemeId;
  reducedMotion: boolean;
  overrides: CustomThemeOverrides;
  typographyPreset: TypographyPresetId;
  bevelStyle: BevelStyle;
  scanlinesOpacity: number | null;
  customCss: string;
  customCssEnabled: boolean;
  uiDensity?: "comfortable" | "compact";
  visualizerStyle?: "bars" | "scope" | "cassette" | "vu" | "crt-matrix";
}

export function serializeThemeBundle(bundle: ThemeExportBundle): string {
  return JSON.stringify(bundle, null, 2);
}

export function parseThemeBundle(rawJson: string): ThemeExportBundle {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error("Invalid theme JSON file.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Theme file must be a JSON object.");
  }

  const record = parsed as Record<string, unknown>;
  if (record.format !== THEME_BUNDLE_FORMAT) {
    throw new Error(`Unsupported theme format. Expected "${THEME_BUNDLE_FORMAT}".`);
  }

  const theme = getThemeById(typeof record.themeId === "string" ? record.themeId : "");

  const overrides: CustomThemeOverrides = {};
  if (record.overrides && typeof record.overrides === "object") {
    const rawOverrides = record.overrides as Record<string, unknown>;
    for (const key of VALID_OVERRIDE_KEYS) {
      const val = rawOverrides[key];
      if (typeof val === "string" && HEX_COLOR_RE.test(val.trim())) {
        overrides[key] = val.trim().toLowerCase();
      }
    }
  }

  const rawTypo = record.typographyPreset;
  const typographyPreset: TypographyPresetId =
    typeof rawTypo === "string" && rawTypo in TYPOGRAPHY_PRESETS
      ? (rawTypo as TypographyPresetId)
      : DEFAULT_TYPOGRAPHY_PRESET;

  const bevelStyle: BevelStyle = record.bevelStyle === "flat-pixel" ? "flat-pixel" : "90s-bevel";

  let scanlinesOpacity: number | null = null;
  if (typeof record.scanlinesOpacity === "number" && Number.isFinite(record.scanlinesOpacity)) {
    scanlinesOpacity = Math.max(0, Math.min(0.25, record.scanlinesOpacity));
  }

  const customCss =
    typeof record.customCss === "string" ? record.customCss.slice(0, MAX_USER_CSS_LENGTH) : "";

  const uiDensity =
    record.uiDensity === "compact" || record.uiDensity === "comfortable"
      ? record.uiDensity
      : undefined;

  const visualizerStyle =
    record.visualizerStyle === "bars" ||
    record.visualizerStyle === "scope" ||
    record.visualizerStyle === "cassette" ||
    record.visualizerStyle === "vu" ||
    record.visualizerStyle === "crt-matrix"
      ? record.visualizerStyle
      : undefined;

  return {
    format: THEME_BUNDLE_FORMAT,
    exportedAt:
      typeof record.exportedAt === "string" ? record.exportedAt : new Date().toISOString(),
    themeId: theme.id,
    reducedMotion: Boolean(record.reducedMotion),
    overrides,
    typographyPreset,
    bevelStyle,
    scanlinesOpacity,
    customCss,
    customCssEnabled: Boolean(record.customCssEnabled),
    uiDensity,
    visualizerStyle,
  };
}
