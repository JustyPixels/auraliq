export type ThemeId =
  "midnight-cassette" | "crt-purple" | "analog-amber" | "retro-terminal" | "classic-gray";

export type TypographyPresetId =
  "classic-90s" | "monospace-crt" | "system-clean" | "retro-terminal";

export type BevelStyle = "90s-bevel" | "flat-pixel";

export interface ThemeColors {
  bg: string;
  bgGradient: string;
  surface: string;
  surfaceElevated: string;
  surfaceInset: string;
  text: string;
  textMuted: string;
  accent: string;
  accentHover: string;
  accentContrast: string;
  accentSoft: string;
  secondaryAccent: string;
  border: string;
  borderHighlight: string;
  bevelLight: string;
  bevelDark: string;
  titlebarBg: string;
  ok: string;
  warn: string;
  danger: string;
}

export type CustomThemeColorKey =
  | "bg"
  | "surface"
  | "surfaceElevated"
  | "surfaceInset"
  | "text"
  | "textMuted"
  | "accent"
  | "secondaryAccent"
  | "border"
  | "borderHighlight";

export type CustomThemeOverrides = Partial<Record<CustomThemeColorKey, string>>;

export interface ThemeTypography {
  fontSans: string;
  fontMono: string;
  fontDisplay: string;
}

export interface ThemeLayout {
  radiusSm: string;
  radiusMd: string;
  radiusLg: string;
}

export interface ThemeEffects {
  scanlinesOpacity: number;
  glowStrength: string;
}

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  description: string;
  appearance: "dark" | "light";
  colors: ThemeColors;
  typography: ThemeTypography;
  layout: ThemeLayout;
  effects: ThemeEffects;
}
