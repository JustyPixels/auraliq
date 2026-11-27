import { create } from "zustand";
import { NAV_ITEMS, type NavSectionId } from "../layouts/nav";
import type { RightPanelTab } from "../layouts/RightPanel";

export const MIN_SIDEBAR_WIDTH = 180;
export const MAX_SIDEBAR_WIDTH = 340;
export const DEFAULT_SIDEBAR_WIDTH = 232;
export const LOCKED_NAV_SECTIONS: readonly NavSectionId[] = ["home", "settings"];

export type UiDensity = "comfortable" | "compact";

const STORAGE_KEY = "auraliq.layout.v1";
const ALL_NAV_IDS: NavSectionId[] = NAV_ITEMS.map((item) => item.id);

interface PersistedLayoutState {
  defaultLandingPage: NavSectionId;
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  navOrder: NavSectionId[];
  hiddenSections: NavSectionId[];
  pinnedSections: NavSectionId[];
  rightPanelOpen: boolean;
  rightPanelTab: RightPanelTab;
  uiDensity: UiDensity;
}

export function clampSidebarWidth(width: number): number {
  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, Math.round(width)));
}

function normalizeNavOrder(order?: NavSectionId[]): NavSectionId[] {
  if (!Array.isArray(order)) {
    return [...ALL_NAV_IDS];
  }
  const valid = order.filter((id): id is NavSectionId => ALL_NAV_IDS.includes(id));
  const missing = ALL_NAV_IDS.filter((id) => !valid.includes(id));
  return [...valid, ...missing];
}

function getDefaultPersistedState(): PersistedLayoutState {
  return {
    defaultLandingPage: "home",
    sidebarCollapsed: false,
    sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
    navOrder: [...ALL_NAV_IDS],
    hiddenSections: [],
    pinnedSections: [],
    rightPanelOpen: false,
    rightPanelTab: "queue",
    uiDensity: "comfortable",
  };
}

function readPersistedLayout(): PersistedLayoutState {
  const defaults = getDefaultPersistedState();
  try {
    if (typeof localStorage === "undefined") {
      return defaults;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaults;
    }
    const parsed = JSON.parse(raw) as Partial<PersistedLayoutState>;
    const navOrder = normalizeNavOrder(parsed.navOrder);
    const hiddenSections = Array.isArray(parsed.hiddenSections)
      ? parsed.hiddenSections.filter(
          (id): id is NavSectionId => ALL_NAV_IDS.includes(id) && !LOCKED_NAV_SECTIONS.includes(id),
        )
      : [];
    const pinnedSections = Array.isArray(parsed.pinnedSections)
      ? parsed.pinnedSections.filter((id): id is NavSectionId => ALL_NAV_IDS.includes(id))
      : [];
    const defaultLandingPage =
      parsed.defaultLandingPage &&
      ALL_NAV_IDS.includes(parsed.defaultLandingPage) &&
      !hiddenSections.includes(parsed.defaultLandingPage)
        ? parsed.defaultLandingPage
        : "home";

    return {
      defaultLandingPage,
      sidebarCollapsed: Boolean(parsed.sidebarCollapsed),
      sidebarWidth:
        typeof parsed.sidebarWidth === "number"
          ? clampSidebarWidth(parsed.sidebarWidth)
          : DEFAULT_SIDEBAR_WIDTH,
      navOrder,
      hiddenSections,
      pinnedSections,
      rightPanelOpen: Boolean(parsed.rightPanelOpen),
      rightPanelTab:
        parsed.rightPanelTab === "queue" ||
        parsed.rightPanelTab === "info" ||
        parsed.rightPanelTab === "visualizer"
          ? parsed.rightPanelTab
          : "queue",
      uiDensity: parsed.uiDensity === "compact" ? "compact" : "comfortable",
    };
  } catch {
    return defaults;
  }
}

function writePersistedLayout(state: PersistedLayoutState): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch {
    // Ignore storage errors
  }
}

export function applyLayoutVarsToDocument(sidebarWidth: number, uiDensity: UiDensity): void {
  if (typeof document === "undefined") {
    return;
  }
  const root = document.documentElement;
  root.style.setProperty("--aq-sidebar-width", `${clampSidebarWidth(sidebarWidth)}px`);
  root.dataset.density = uiDensity;
}

function pickPersisted(state: LayoutStore): PersistedLayoutState {
  return {
    defaultLandingPage: state.defaultLandingPage,
    sidebarCollapsed: state.sidebarCollapsed,
    sidebarWidth: state.sidebarWidth,
    navOrder: state.navOrder,
    hiddenSections: state.hiddenSections,
    pinnedSections: state.pinnedSections,
    rightPanelOpen: state.rightPanelOpen,
    rightPanelTab: state.rightPanelTab,
    uiDensity: state.uiDensity,
  };
}

export interface LayoutStore extends PersistedLayoutState {
  activeSection: NavSectionId;
  setActiveSection: (section: NavSectionId) => void;
  setDefaultLandingPage: (section: NavSectionId) => void;
  toggleSidebarCollapsed: () => void;
  setSidebarWidth: (width: number) => void;
  togglePinSection: (section: NavSectionId) => void;
  toggleHideSection: (section: NavSectionId) => void;
  moveNavSection: (section: NavSectionId, direction: "up" | "down") => void;
  toggleRightPanelTab: (tab: RightPanelTab) => void;
  setRightPanelOpen: (open: boolean) => void;
  setRightPanelTab: (tab: RightPanelTab) => void;
  setUiDensity: (density: UiDensity) => void;
  applyLayoutToDocument: () => void;
  resetLayout: () => void;
}

const initial = readPersistedLayout();

export const useLayoutStore = create<LayoutStore>((set, get) => ({
  ...initial,
  activeSection: initial.defaultLandingPage,
  setActiveSection: (section) => {
    set({ activeSection: section });
  },
  setDefaultLandingPage: (section) => {
    set((state) => {
      const next = { ...state, defaultLandingPage: section };
      writePersistedLayout(pickPersisted(next));
      return { defaultLandingPage: section };
    });
  },
  toggleSidebarCollapsed: () => {
    set((state) => {
      const sidebarCollapsed = !state.sidebarCollapsed;
      const next = { ...state, sidebarCollapsed };
      writePersistedLayout(pickPersisted(next));
      return { sidebarCollapsed };
    });
  },
  setSidebarWidth: (width) => {
    const clamped = clampSidebarWidth(width);
    set((state) => {
      const next = { ...state, sidebarWidth: clamped };
      writePersistedLayout(pickPersisted(next));
      applyLayoutVarsToDocument(clamped, state.uiDensity);
      return { sidebarWidth: clamped };
    });
  },
  togglePinSection: (section) => {
    set((state) => {
      const exists = state.pinnedSections.includes(section);
      const pinnedSections = exists
        ? state.pinnedSections.filter((id) => id !== section)
        : [...state.pinnedSections, section];
      const next = { ...state, pinnedSections };
      writePersistedLayout(pickPersisted(next));
      return { pinnedSections };
    });
  },
  toggleHideSection: (section) => {
    if (LOCKED_NAV_SECTIONS.includes(section)) {
      return;
    }
    set((state) => {
      const isHidden = state.hiddenSections.includes(section);
      const hiddenSections = isHidden
        ? state.hiddenSections.filter((id) => id !== section)
        : [...state.hiddenSections, section];
      const activeSection =
        !isHidden && state.activeSection === section ? "home" : state.activeSection;
      const defaultLandingPage =
        !isHidden && state.defaultLandingPage === section ? "home" : state.defaultLandingPage;
      const next = { ...state, hiddenSections, activeSection, defaultLandingPage };
      writePersistedLayout(pickPersisted(next));
      return { hiddenSections, activeSection, defaultLandingPage };
    });
  },
  moveNavSection: (section, direction) => {
    set((state) => {
      const idx = state.navOrder.indexOf(section);
      if (idx === -1) {
        return state;
      }
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= state.navOrder.length) {
        return state;
      }
      const navOrder = [...state.navOrder];
      const [item] = navOrder.splice(idx, 1);
      navOrder.splice(targetIdx, 0, item);
      const next = { ...state, navOrder };
      writePersistedLayout(pickPersisted(next));
      return { navOrder };
    });
  },
  toggleRightPanelTab: (tab) => {
    set((state) => {
      const rightPanelOpen = !(state.rightPanelOpen && state.rightPanelTab === tab);
      const next = { ...state, rightPanelOpen, rightPanelTab: tab };
      writePersistedLayout(pickPersisted(next));
      return { rightPanelOpen, rightPanelTab: tab };
    });
  },
  setRightPanelOpen: (rightPanelOpen) => {
    set((state) => {
      const next = { ...state, rightPanelOpen };
      writePersistedLayout(pickPersisted(next));
      return { rightPanelOpen };
    });
  },
  setRightPanelTab: (rightPanelTab) => {
    set((state) => {
      const next = { ...state, rightPanelTab };
      writePersistedLayout(pickPersisted(next));
      return { rightPanelTab };
    });
  },
  setUiDensity: (uiDensity) => {
    set((state) => {
      const next = { ...state, uiDensity };
      writePersistedLayout(pickPersisted(next));
      applyLayoutVarsToDocument(state.sidebarWidth, uiDensity);
      return { uiDensity };
    });
  },
  applyLayoutToDocument: () => {
    const { sidebarWidth, uiDensity } = get();
    applyLayoutVarsToDocument(sidebarWidth, uiDensity);
  },
  resetLayout: () => {
    const defaults = getDefaultPersistedState();
    writePersistedLayout(defaults);
    applyLayoutVarsToDocument(defaults.sidebarWidth, defaults.uiDensity);
    set({ ...defaults, activeSection: defaults.defaultLandingPage });
  },
}));
