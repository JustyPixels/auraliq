import { afterEach, describe, expect, it } from "vitest";
import { applyThemeToDocument, getThemeById } from "./applyTheme";
import { BUILT_IN_THEMES, DEFAULT_THEME_ID } from "./presets";

describe("theme system", () => {
  afterEach(() => {
    delete document.documentElement.dataset.theme;
    delete document.documentElement.dataset.appearance;
    delete document.documentElement.dataset.reducedMotion;
  });

  it("resolves built-in themes and falls back to default", () => {
    expect(getThemeById("analog-amber").name).toBe("Analog Amber");
    expect(getThemeById("non-existent-theme").id).toBe(DEFAULT_THEME_ID);
  });

  it("applies CSS variables and attributes for every built-in theme", () => {
    for (const theme of BUILT_IN_THEMES) {
      applyThemeToDocument(theme, true);
      expect(document.documentElement.dataset.theme).toBe(theme.id);
      expect(document.documentElement.dataset.appearance).toBe(theme.appearance);
      expect(document.documentElement.dataset.reducedMotion).toBe("true");
      expect(document.documentElement.style.getPropertyValue("--aq-accent")).toBe(
        theme.colors.accent,
      );
      expect(document.documentElement.style.getPropertyValue("--aq-bg")).toBe(theme.colors.bg);
    }
  });
});
