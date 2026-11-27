import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  useLayoutStore,
} from "./useLayoutStore";

describe("useLayoutStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useLayoutStore.getState().resetLayout();
  });

  it("clamps sidebar width within min/max bounds and persists", () => {
    useLayoutStore.getState().setSidebarWidth(999);
    expect(useLayoutStore.getState().sidebarWidth).toBe(MAX_SIDEBAR_WIDTH);

    useLayoutStore.getState().setSidebarWidth(50);
    expect(useLayoutStore.getState().sidebarWidth).toBe(MIN_SIDEBAR_WIDTH);
    expect(document.documentElement.style.getPropertyValue("--aq-sidebar-width")).toBe(
      `${MIN_SIDEBAR_WIDTH}px`,
    );
  });

  it("pins, reorders, and hides sections while keeping Home and Settings locked", () => {
    const store = useLayoutStore.getState();

    store.togglePinSection("playlists");
    expect(useLayoutStore.getState().pinnedSections).toContain("playlists");

    store.setActiveSection("discover");
    store.toggleHideSection("discover");
    expect(useLayoutStore.getState().hiddenSections).toContain("discover");
    expect(useLayoutStore.getState().activeSection).toBe("home");

    store.toggleHideSection("home");
    store.toggleHideSection("settings");
    expect(useLayoutStore.getState().hiddenSections).not.toContain("home");
    expect(useLayoutStore.getState().hiddenSections).not.toContain("settings");

    const initialIndex = useLayoutStore.getState().navOrder.indexOf("search");
    store.moveNavSection("search", "down");
    expect(useLayoutStore.getState().navOrder.indexOf("search")).toBe(initialIndex + 1);
  });

  it("updates UI density and resets layout cleanly", () => {
    useLayoutStore.getState().setUiDensity("compact");
    expect(document.documentElement.dataset.density).toBe("compact");

    useLayoutStore.getState().resetLayout();
    expect(useLayoutStore.getState().sidebarWidth).toBe(DEFAULT_SIDEBAR_WIDTH);
    expect(useLayoutStore.getState().uiDensity).toBe("comfortable");
    expect(document.documentElement.dataset.density).toBe("comfortable");
  });
});
