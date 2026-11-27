import { BUILT_IN_THEMES } from "../themes/presets";
import { useThemeStore } from "../stores/useThemeStore";
import { Button } from "./Button";

export function ThemePicker() {
  const { themeId, reducedMotion, setTheme, setReducedMotion } = useThemeStore();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="aq-theme-grid" role="radiogroup" aria-label="Theme selection">
        {BUILT_IN_THEMES.map((theme) => {
          const selected = theme.id === themeId;
          return (
            <button
              key={theme.id}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`aq-theme-card ${selected ? "aq-theme-card--selected" : ""}`}
              onClick={() => setTheme(theme.id)}
            >
              <div className="aq-theme-swatches" aria-hidden="true">
                <span className="aq-theme-swatch" style={{ background: theme.colors.bg }} />
                <span className="aq-theme-swatch" style={{ background: theme.colors.surface }} />
                <span className="aq-theme-swatch" style={{ background: theme.colors.accent }} />
                <span
                  className="aq-theme-swatch"
                  style={{ background: theme.colors.secondaryAccent }}
                />
              </div>
              <span className="aq-theme-card__name">{theme.name}</span>
              <span className="aq-theme-card__desc">{theme.description}</span>
            </button>
          );
        })}
      </div>

      <div className="aq-row-wrap">
        <Button
          size="sm"
          variant="secondary"
          active={reducedMotion}
          aria-pressed={reducedMotion}
          onClick={() => setReducedMotion(!reducedMotion)}
        >
          Reduced Motion: {reducedMotion ? "On" : "Off"}
        </Button>
      </div>
    </div>
  );
}
