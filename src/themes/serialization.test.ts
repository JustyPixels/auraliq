import { describe, expect, it } from "vitest";
import { parseThemeBundle, serializeThemeBundle, THEME_BUNDLE_FORMAT } from "./serialization";

describe("theme serialization", () => {
  it("roundtrips valid theme bundle and filters invalid hex overrides", () => {
    const json = serializeThemeBundle({
      format: THEME_BUNDLE_FORMAT,
      exportedAt: "2026-11-27T00:00:00.000Z",
      themeId: "crt-purple",
      reducedMotion: true,
      overrides: {
        accent: "#a855f7",
        bg: "not-a-hex",
      },
      typographyPreset: "monospace-crt",
      bevelStyle: "90s-bevel",
      scanlinesOpacity: 0.08,
      customCss: ".aq-panel { border-color: #a855f7; }",
      customCssEnabled: true,
      uiDensity: "compact",
      visualizerStyle: "scope",
    });

    const parsed = parseThemeBundle(json);
    expect(parsed.themeId).toBe("crt-purple");
    expect(parsed.overrides.accent).toBe("#a855f7");
    expect(parsed.overrides.bg).toBeUndefined();
    expect(parsed.typographyPreset).toBe("monospace-crt");
    expect(parsed.uiDensity).toBe("compact");
    expect(parsed.visualizerStyle).toBe("scope");
  });

  it("rejects invalid JSON or unsupported format", () => {
    expect(() => parseThemeBundle("{bad json")).toThrow();
    expect(() => parseThemeBundle(JSON.stringify({ format: "other" }))).toThrow();
  });
});
