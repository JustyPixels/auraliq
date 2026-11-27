import { create } from "zustand";

export type ShortcutActionId =
  | "nav.home"
  | "nav.search"
  | "nav.library"
  | "nav.playlists"
  | "nav.downloads"
  | "nav.settings"
  | "ui.toggleSidebar"
  | "ui.toggleQueue"
  | "ui.shortcutsHelp";

export interface ShortcutDefinition {
  id: ShortcutActionId;
  label: string;
  defaultBinding: string;
}

export const SHORTCUT_DEFINITIONS: readonly ShortcutDefinition[] = [
  { id: "nav.home", label: "Go to Home", defaultBinding: "Alt+1" },
  { id: "nav.search", label: "Go to Search", defaultBinding: "Ctrl+K" },
  { id: "nav.library", label: "Go to Your Library", defaultBinding: "Alt+2" },
  { id: "nav.playlists", label: "Go to Playlists", defaultBinding: "Alt+3" },
  { id: "nav.downloads", label: "Go to Downloads", defaultBinding: "Alt+4" },
  { id: "nav.settings", label: "Open Settings", defaultBinding: "Ctrl+," },
  { id: "ui.toggleSidebar", label: "Toggle Sidebar", defaultBinding: "Ctrl+B" },
  { id: "ui.toggleQueue", label: "Toggle Queue Panel", defaultBinding: "Ctrl+Shift+Q" },
  { id: "ui.shortcutsHelp", label: "Show Keyboard Shortcuts", defaultBinding: "?" },
];

const STORAGE_KEY = "auraliq.shortcuts.v1";
const MODIFIER_KEYS = new Set(["Control", "Shift", "Alt", "Meta"]);

function getDefaultBindings(): Record<ShortcutActionId, string> {
  return SHORTCUT_DEFINITIONS.reduce(
    (acc, item) => {
      acc[item.id] = item.defaultBinding;
      return acc;
    },
    {} as Record<ShortcutActionId, string>,
  );
}

function readPersistedBindings(): Record<ShortcutActionId, string> {
  const defaults = getDefaultBindings();
  try {
    if (typeof localStorage === "undefined") {
      return defaults;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaults;
    }
    const parsed = JSON.parse(raw) as Partial<Record<ShortcutActionId, string>>;
    const merged = { ...defaults };
    for (const def of SHORTCUT_DEFINITIONS) {
      const value = parsed[def.id];
      if (typeof value === "string" && value.trim().length > 0) {
        merged[def.id] = value.trim();
      }
    }
    return merged;
  } catch {
    return defaults;
  }
}

function writePersistedBindings(bindings: Record<ShortcutActionId, string>): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings));
    }
  } catch {
    // Ignore storage errors
  }
}

export function formatKeyEvent(event: KeyboardEvent): string | null {
  if (MODIFIER_KEYS.has(event.key)) {
    return null;
  }

  const parts: string[] = [];
  if (event.ctrlKey || event.metaKey) {
    parts.push("Ctrl");
  }
  if (event.altKey) {
    parts.push("Alt");
  }
  if (event.shiftKey && event.key !== "?") {
    parts.push("Shift");
  }

  const key = event.key.length === 1 ? event.key.toUpperCase() : event.key;
  parts.push(key);
  return parts.join("+");
}

export function matchesShortcut(event: KeyboardEvent, binding: string): boolean {
  const formatted = formatKeyEvent(event);
  if (!formatted) {
    return false;
  }
  return formatted.toLowerCase() === binding.trim().toLowerCase();
}

export interface ShortcutsStore {
  bindings: Record<ShortcutActionId, string>;
  setBinding: (actionId: ShortcutActionId, binding: string) => void;
  resetShortcuts: () => void;
}

export const useShortcutsStore = create<ShortcutsStore>((set) => ({
  bindings: readPersistedBindings(),
  setBinding: (actionId, binding) => {
    set((state) => {
      const bindings = { ...state.bindings, [actionId]: binding };
      writePersistedBindings(bindings);
      return { bindings };
    });
  },
  resetShortcuts: () => {
    const bindings = getDefaultBindings();
    writePersistedBindings(bindings);
    set({ bindings });
  },
}));
