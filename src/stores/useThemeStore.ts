import { create } from "zustand";
import { applyThemeToDocument, getThemeById } from "../themes/applyTheme";
import { DEFAULT_THEME_ID, DEFAULT_TYPOGRAPHY_PRESET } from "../themes/presets";
import type { ThemeExportBundle } from "../themes/serialization";
import type {
  BevelStyle,
  CustomThemeColorKey,
  CustomThemeOverrides,
  ThemeId,
  TypographyPresetId,
} from "../themes/types";
import { applyUserCssToDocument } from "../themes/userCss";

const STORAGE_KEY_V2 = "auraliq.theme.v2";
const STORAGE_KEY_V1 = "auraliq.theme.v1";

interface PersistedThemeState {
  themeId: ThemeId;
  reducedMotion: boolean;
  overrides: CustomThemeOverrides;
  typographyPreset: TypographyPresetId;
  bevelStyle: BevelStyle;
  scanlinesOpacity: number | null;
  customCss: string;
  customCssEnabled: boolean;
}

const DEFAULT_PERSISTED_STATE: PersistedThemeState = {
  themeId: DEFAULT_THEME_ID,
  reducedMotion: false,
  overrides: {},
  typographyPreset: DEFAULT_TYPOGRAPHY_PRESET,
  bevelStyle: "90s-bevel",
  scanlinesOpacity: null,
  customCss: "",
  customCssEnabled: false,
};

function readPersistedState(): PersistedThemeState {
  try {
    if (typeof localStorage === "undefined") {
      return DEFAULT_PERSISTED_STATE;
    }
    const rawV2 = localStorage.getItem(STORAGE_KEY_V2);
    if (rawV2) {
      const parsed = JSON.parse(rawV2) as Partial<PersistedThemeState>;
      const resolved = getThemeById(parsed.themeId ?? DEFAULT_THEME_ID);
      return {
        themeId: resolved.id,
        reducedMotion: Boolean(parsed.reducedMotion),
        overrides: parsed.overrides ?? {},
        typographyPreset: parsed.typographyPreset ?? DEFAULT_TYPOGRAPHY_PRESET,
        bevelStyle: parsed.bevelStyle === "flat-pixel" ? "flat-pixel" : "90s-bevel",
        scanlinesOpacity:
          typeof parsed.scanlinesOpacity === "number" ? parsed.scanlinesOpacity : null,
        customCss: typeof parsed.customCss === "string" ? parsed.customCss : "",
        customCssEnabled: Boolean(parsed.customCssEnabled),
      };
    }

    const rawV1 = localStorage.getItem(STORAGE_KEY_V1);
    if (rawV1) {
      const parsed = JSON.parse(rawV1) as { themeId?: string; reducedMotion?: boolean };
      const resolved = getThemeById(parsed.themeId ?? DEFAULT_THEME_ID);
      return {
        ...DEFAULT_PERSISTED_STATE,
        themeId: resolved.id,
        reducedMotion: Boolean(parsed.reducedMotion),
      };
    }

    return DEFAULT_PERSISTED_STATE;
  } catch {
    return DEFAULT_PERSISTED_STATE;
  }
}

function writePersistedState(state: PersistedThemeState): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(state));
    }
  } catch {
    // Ignore storage quota/sandbox errors
  }
}

function syncThemeToDom(state: PersistedThemeState): string[] {
  const theme = getThemeById(state.themeId);
  applyThemeToDocument(theme, state.reducedMotion, {
    overrides: state.overrides,
    typographyPreset: state.typographyPreset,
    bevelStyle: state.bevelStyle,
    scanlinesOpacity: state.scanlinesOpacity,
  });
  return applyUserCssToDocument(state.customCss, state.customCssEnabled);
}

export interface ThemeStore extends PersistedThemeState {
  cssWarnings: string[];
  setTheme: (themeId: ThemeId) => void;
  setReducedMotion: (reducedMotion: boolean) => void;
  setColorOverride: (key: CustomThemeColorKey, value: string) => void;
  clearColorOverrides: () => void;
  setTypographyPreset: (typographyPreset: TypographyPresetId) => void;
  setBevelStyle: (bevelStyle: BevelStyle) => void;
  setScanlinesOpacity: (scanlinesOpacity: number | null) => void;
  setCustomCss: (customCss: string) => void;
  setCustomCssEnabled: (customCssEnabled: boolean) => void;
  applyImportedBundle: (bundle: ThemeExportBundle) => void;
  safeResetCustomization: () => void;
  initTheme: () => void;
}

const initial = readPersistedState();

function updateAndPersist(
  get: () => ThemeStore,
  set: (partial: Partial<ThemeStore>) => void,
  patch: Partial<PersistedThemeState>,
): void {
  const current = get();
  const next: PersistedThemeState = {
    themeId: patch.themeId ?? current.themeId,
    reducedMotion: patch.reducedMotion ?? current.reducedMotion,
    overrides: patch.overrides ?? current.overrides,
    typographyPreset: patch.typographyPreset ?? current.typographyPreset,
    bevelStyle: patch.bevelStyle ?? current.bevelStyle,
    scanlinesOpacity:
      "scanlinesOpacity" in patch ? (patch.scanlinesOpacity ?? null) : current.scanlinesOpacity,
    customCss: patch.customCss ?? current.customCss,
    customCssEnabled: patch.customCssEnabled ?? current.customCssEnabled,
  };
  const warnings = syncThemeToDom(next);
  writePersistedState(next);
  set({ ...next, cssWarnings: warnings });
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  ...initial,
  cssWarnings: [],
  setTheme: (themeId) => {
    const theme = getThemeById(themeId);
    updateAndPersist(get, set, { themeId: theme.id });
  },
  setReducedMotion: (reducedMotion) => {
    updateAndPersist(get, set, { reducedMotion });
  },
  setColorOverride: (key, value) => {
    const overrides = { ...get().overrides, [key]: value };
    updateAndPersist(get, set, { overrides });
  },
  clearColorOverrides: () => {
    updateAndPersist(get, set, { overrides: {} });
  },
  setTypographyPreset: (typographyPreset) => {
    updateAndPersist(get, set, { typographyPreset });
  },
  setBevelStyle: (bevelStyle) => {
    updateAndPersist(get, set, { bevelStyle });
  },
  setScanlinesOpacity: (scanlinesOpacity) => {
    updateAndPersist(get, set, { scanlinesOpacity });
  },
  setCustomCss: (customCss) => {
    updateAndPersist(get, set, { customCss });
  },
  setCustomCssEnabled: (customCssEnabled) => {
    updateAndPersist(get, set, { customCssEnabled });
  },
  applyImportedBundle: (bundle) => {
    updateAndPersist(get, set, {
      themeId: bundle.themeId,
      reducedMotion: bundle.reducedMotion,
      overrides: bundle.overrides,
      typographyPreset: bundle.typographyPreset,
      bevelStyle: bundle.bevelStyle,
      scanlinesOpacity: bundle.scanlinesOpacity,
      customCss: bundle.customCss,
      customCssEnabled: bundle.customCssEnabled,
    });
  },
  safeResetCustomization: () => {
    const warnings = syncThemeToDom(DEFAULT_PERSISTED_STATE);
    writePersistedState(DEFAULT_PERSISTED_STATE);
    set({ ...DEFAULT_PERSISTED_STATE, cssWarnings: warnings });
  },
  initTheme: () => {
    const current = get();
    const warnings = syncThemeToDom(current);
    set({ cssWarnings: warnings });
  },
}));
