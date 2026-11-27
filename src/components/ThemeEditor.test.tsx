import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useThemeStore } from "../stores/useThemeStore";
import { USER_CSS_STYLE_ID } from "../themes/userCss";
import { CustomCssEditor } from "./CustomCssEditor";
import { ThemeEditor } from "./ThemeEditor";

describe("ThemeEditor & CustomCssEditor", () => {
  afterEach(() => {
    useThemeStore.getState().safeResetCustomization();
    localStorage.clear();
  });

  it("updates color overrides, typography preset, and bevel style live", () => {
    render(<ThemeEditor />);

    const accentInput = screen.getByLabelText("Accent color");
    fireEvent.change(accentInput, { target: { value: "#ff00aa" } });
    expect(document.documentElement.style.getPropertyValue("--aq-accent")).toBe("#ff00aa");

    fireEvent.click(screen.getByRole("button", { name: "Monospace CRT" }));
    expect(useThemeStore.getState().typographyPreset).toBe("monospace-crt");

    fireEvent.click(screen.getByRole("button", { name: "Flat Pixel" }));
    expect(document.documentElement.dataset.bevelStyle).toBe("flat-pixel");

    fireEvent.click(screen.getByRole("button", { name: "Safe Reset All" }));
    expect(useThemeStore.getState().overrides).toEqual({});
    expect(document.documentElement.dataset.bevelStyle).toBe("90s-bevel");
  });

  it("injects sanitized live CSS into #auraliq-user-css and resets safely", () => {
    render(<CustomCssEditor />);

    fireEvent.click(screen.getByRole("button", { name: /Custom CSS:/i }));
    const textarea = screen.getByLabelText("Custom CSS editor");
    fireEvent.change(textarea, {
      target: { value: ".aq-panel { border-color: #c084fc; }" },
    });

    const styleEl = document.getElementById(USER_CSS_STYLE_ID);
    expect(styleEl).not.toBeNull();
    expect(styleEl?.textContent).toContain("#c084fc");

    fireEvent.click(screen.getByRole("button", { name: "Safe Reset CSS" }));
    expect(document.getElementById(USER_CSS_STYLE_ID)).toBeNull();
  });
});
