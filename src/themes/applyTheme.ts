import { BUILT_IN_THEMES, DEFAULT_THEME_ID, TYPOGRAPHY_PRESETS } from "./presets";
import type {
  BevelStyle,
  CustomThemeOverrides,
  ThemeDefinition,
  TypographyPresetId,
} from "./types";

export interface ApplyThemeOptions {
  overrides?: CustomThemeOverrides;
  typographyPreset?: TypographyPresetId;
  bevelStyle?: BevelStyle;
  scanlinesOpacity?: number | null;
}

export function getThemeById(id: string): ThemeDefinition {
  return (
    BUILT_IN_THEMES.find((theme) => theme.id === id) ??
    BUILT_IN_THEMES.find((theme) => theme.id === DEFAULT_THEME_ID) ??
    BUILT_IN_THEMES[0]
  );
}

export function applyThemeToDocument(
  theme: ThemeDefinition,
  reducedMotion: boolean,
  options: ApplyThemeOptions = {},
): void {
  if (typeof document === "undefined") {
    return;
  }

  const overrides = options.overrides ?? {};
  const typography = options.typographyPreset
    ? TYPOGRAPHY_PRESETS[options.typographyPreset].typography
    : theme.typography;
  const bevelStyle: BevelStyle = options.bevelStyle ?? "90s-bevel";
  const scanlinesOpacity =
    options.scanlinesOpacity !== null && options.scanlinesOpacity !== undefined
      ? Math.max(0, Math.min(0.25, options.scanlinesOpacity))
      : theme.effects.scanlinesOpacity;

  const root = document.documentElement;
  root.dataset.theme = theme.id;
  root.dataset.appearance = theme.appearance;
  root.dataset.reducedMotion = String(reducedMotion);
  root.dataset.bevelStyle = bevelStyle;

  const vars: Record<string, string> = {
    "--aq-bg": overrides.bg || theme.colors.bg,
    "--aq-bg-gradient": theme.colors.bgGradient,
    "--aq-surface": overrides.surface || theme.colors.surface,
    "--aq-surface-elevated": overrides.surfaceElevated || theme.colors.surfaceElevated,
    "--aq-surface-inset": overrides.surfaceInset || theme.colors.surfaceInset,
    "--aq-text": overrides.text || theme.colors.text,
    "--aq-muted": overrides.textMuted || theme.colors.textMuted,
    "--aq-accent": overrides.accent || theme.colors.accent,
    "--aq-accent-hover": overrides.accent || theme.colors.accentHover,
    "--aq-accent-contrast": theme.colors.accentContrast,
    "--aq-accent-soft": theme.colors.accentSoft,
    "--aq-secondary-accent": overrides.secondaryAccent || theme.colors.secondaryAccent,
    "--aq-border": overrides.border || theme.colors.border,
    "--aq-border-highlight": overrides.borderHighlight || theme.colors.borderHighlight,
    "--aq-bevel-light": overrides.borderHighlight || theme.colors.bevelLight,
    "--aq-bevel-dark": theme.colors.bevelDark,
    "--aq-titlebar-bg": theme.colors.titlebarBg,
    "--aq-ok": theme.colors.ok,
    "--aq-warn": theme.colors.warn,
    "--aq-danger": theme.colors.danger,
    "--aq-font-sans": typography.fontSans,
    "--aq-font-mono": typography.fontMono,
    "--aq-font-display": typography.fontDisplay,
    "--aq-radius-sm": theme.layout.radiusSm,
    "--aq-radius-md": theme.layout.radiusMd,
    "--aq-radius-lg": theme.layout.radiusLg,
    "--aq-scanlines-opacity": String(scanlinesOpacity),
    "--aq-glow": theme.effects.glowStrength,
  };

  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}
