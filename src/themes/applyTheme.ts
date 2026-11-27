import { BUILT_IN_THEMES, DEFAULT_THEME_ID } from "./presets";
import type { ThemeDefinition } from "./types";

export function getThemeById(id: string): ThemeDefinition {
  return (
    BUILT_IN_THEMES.find((theme) => theme.id === id) ??
    BUILT_IN_THEMES.find((theme) => theme.id === DEFAULT_THEME_ID) ??
    BUILT_IN_THEMES[0]
  );
}

export function applyThemeToDocument(theme: ThemeDefinition, reducedMotion: boolean): void {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  root.dataset.theme = theme.id;
  root.dataset.appearance = theme.appearance;
  root.dataset.reducedMotion = String(reducedMotion);

  const vars: Record<string, string> = {
    "--aq-bg": theme.colors.bg,
    "--aq-bg-gradient": theme.colors.bgGradient,
    "--aq-surface": theme.colors.surface,
    "--aq-surface-elevated": theme.colors.surfaceElevated,
    "--aq-surface-inset": theme.colors.surfaceInset,
    "--aq-text": theme.colors.text,
    "--aq-muted": theme.colors.textMuted,
    "--aq-accent": theme.colors.accent,
    "--aq-accent-hover": theme.colors.accentHover,
    "--aq-accent-contrast": theme.colors.accentContrast,
    "--aq-accent-soft": theme.colors.accentSoft,
    "--aq-secondary-accent": theme.colors.secondaryAccent,
    "--aq-border": theme.colors.border,
    "--aq-border-highlight": theme.colors.borderHighlight,
    "--aq-ok": theme.colors.ok,
    "--aq-warn": theme.colors.warn,
    "--aq-danger": theme.colors.danger,
    "--aq-font-sans": theme.typography.fontSans,
    "--aq-font-mono": theme.typography.fontMono,
    "--aq-font-display": theme.typography.fontDisplay,
    "--aq-radius-sm": theme.layout.radiusSm,
    "--aq-radius-md": theme.layout.radiusMd,
    "--aq-radius-lg": theme.layout.radiusLg,
    "--aq-scanlines-opacity": String(theme.effects.scanlinesOpacity),
    "--aq-glow": theme.effects.glowStrength,
  };

  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}
