import { afterEach, describe, expect, it } from "vitest";
import { applyThemeToDocument, getThemeById } from "./applyTheme";
import { BUILT_IN_THEMES, DEFAULT_THEME_ID } from "./presets";

describe("theme system", () => {
  afterEach(() => {
    delete document.documentElement.dataset.theme;
    delete document.documentElement.dataset.appearance;
    delete document.documentElement.dataset.reducedMotion;
    delete document.documentElement.dataset.bevelStyle;
  });

  it("resolves built-in themes and falls back to default", () => {
    expect(getThemeById("analog-amber").name).toBe("Analog Amber");
    expect(getThemeById("non-existent-theme").id).toBe(DEFAULT_THEME_ID);
  });

  it("applies 0px retro radii, CSS variables, and attributes for every built-in theme", () => {
    for (const theme of BUILT_IN_THEMES) {
      expect(theme.layout.radiusSm).toBe("0px");
      expect(theme.layout.radiusMd).toBe("0px");
      expect(theme.layout.radiusLg).toBe("0px");

      applyThemeToDocument(theme, true);
      expect(document.documentElement.dataset.theme).toBe(theme.id);
      expect(document.documentElement.dataset.appearance).toBe(theme.appearance);
      expect(document.documentElement.dataset.reducedMotion).toBe("true");
      expect(document.documentElement.dataset.bevelStyle).toBe("90s-bevel");
      expect(document.documentElement.style.getPropertyValue("--aq-accent")).toBe(
        theme.colors.accent,
      );
      expect(document.documentElement.style.getPropertyValue("--aq-bg")).toBe(theme.colors.bg);
      expect(document.documentElement.style.getPropertyValue("--aq-radius-md")).toBe("0px");
    }
  });

  it("applies custom color overrides, typography preset, and bevel style", () => {
    const theme = getThemeById("midnight-cassette");
    applyThemeToDocument(theme, false, {
      overrides: { accent: "#ff00ff" },
      typographyPreset: "monospace-crt",
      bevelStyle: "flat-pixel",
      scanlinesOpacity: 0.12,
    });
    expect(document.documentElement.style.getPropertyValue("--aq-accent")).toBe("#ff00ff");
    expect(document.documentElement.dataset.bevelStyle).toBe("flat-pixel");
    expect(document.documentElement.style.getPropertyValue("--aq-scanlines-opacity")).toBe("0.12");
  });
});
