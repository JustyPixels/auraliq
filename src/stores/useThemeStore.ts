import { create } from "zustand";
import { applyThemeToDocument, getThemeById } from "../themes/applyTheme";
import { DEFAULT_THEME_ID } from "../themes/presets";
import type { ThemeId } from "../themes/types";

const STORAGE_KEY = "auraliq.theme.v1";

interface PersistedThemeState {
  themeId: ThemeId;
  reducedMotion: boolean;
}

function readPersistedState(): PersistedThemeState {
  try {
    if (typeof localStorage === "undefined") {
      return { themeId: DEFAULT_THEME_ID, reducedMotion: false };
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { themeId: DEFAULT_THEME_ID, reducedMotion: false };
    }
    const parsed = JSON.parse(raw) as Partial<PersistedThemeState>;
    const resolved = getThemeById(parsed.themeId ?? DEFAULT_THEME_ID);
    return {
      themeId: resolved.id,
      reducedMotion: Boolean(parsed.reducedMotion),
    };
  } catch {
    return { themeId: DEFAULT_THEME_ID, reducedMotion: false };
  }
}

function writePersistedState(state: PersistedThemeState): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch {
    // Ignore storage quota/sandbox errors
  }
}

export interface ThemeStore {
  themeId: ThemeId;
  reducedMotion: boolean;
  setTheme: (themeId: ThemeId) => void;
  setReducedMotion: (reducedMotion: boolean) => void;
  initTheme: () => void;
}

const initial = readPersistedState();

export const useThemeStore = create<ThemeStore>((set, get) => ({
  themeId: initial.themeId,
  reducedMotion: initial.reducedMotion,
  setTheme: (themeId) => {
    const theme = getThemeById(themeId);
    const reducedMotion = get().reducedMotion;
    applyThemeToDocument(theme, reducedMotion);
    writePersistedState({ themeId: theme.id, reducedMotion });
    set({ themeId: theme.id });
  },
  setReducedMotion: (reducedMotion) => {
    const theme = getThemeById(get().themeId);
    applyThemeToDocument(theme, reducedMotion);
    writePersistedState({ themeId: theme.id, reducedMotion });
    set({ reducedMotion });
  },
  initTheme: () => {
    const { themeId, reducedMotion } = get();
    applyThemeToDocument(getThemeById(themeId), reducedMotion);
  },
}));
