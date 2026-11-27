import { Code2, RotateCcw, ShieldAlert } from "lucide-react";
import { useThemeStore } from "../stores/useThemeStore";
import { Button } from "./Button";

const SNIPPET_NEON_DECK = `/* 90s Neon Purple Deck */
.aq-panel__header {
  border-bottom: 2px solid var(--aq-accent);
}
.aq-btn--primary {
  text-transform: uppercase;
  letter-spacing: 0.06em;
}`;

const SNIPPET_COMPACT_DECK = `/* Ultra Compact Hardware Rows */
.aq-track-row {
  padding: 0.28rem 0.5rem;
}`;

export function CustomCssEditor() {
  const { customCss, customCssEnabled, cssWarnings, setCustomCss, setCustomCssEnabled } =
    useThemeStore();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
      <div className="aq-row-wrap" style={{ justifyContent: "space-between" }}>
        <div className="aq-row-wrap">
          <Button
            size="sm"
            variant="secondary"
            active={customCssEnabled}
            aria-pressed={customCssEnabled}
            onClick={() => setCustomCssEnabled(!customCssEnabled)}
          >
            <Code2 size={14} />
            Custom CSS: {customCssEnabled ? "Enabled" : "Disabled"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setCustomCss(SNIPPET_NEON_DECK);
              setCustomCssEnabled(true);
            }}
          >
            Preset: Neon Deck
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setCustomCss(SNIPPET_COMPACT_DECK);
              setCustomCssEnabled(true);
            }}
          >
            Preset: Compact Rows
          </Button>
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setCustomCss("");
            setCustomCssEnabled(false);
          }}
        >
          <RotateCcw size={14} />
          Safe Reset CSS
        </Button>
      </div>

      <textarea
        className="aq-textarea"
        aria-label="Custom CSS editor"
        placeholder="/* Override any --aq-* token or .aq-* class safely (local-only, @import and external url() are blocked) */"
        value={customCss}
        onChange={(e) => setCustomCss(e.target.value)}
      />

      {cssWarnings.length > 0 && (
        <div
          role="alert"
          className="aq-list-row"
          style={{ borderColor: "var(--aq-warn)", color: "var(--aq-warn)" }}
        >
          <div className="aq-row-wrap">
            <ShieldAlert size={14} />
            <span style={{ fontSize: "0.8rem" }}>{cssWarnings.join(" ")}</span>
          </div>
        </div>
      )}

      <span style={{ fontSize: "0.76rem", color: "var(--aq-muted)" }}>
        Injected into <code>&lt;style id=&quot;auraliq-user-css&quot;&gt;</code>. External{" "}
        <code>@import</code>, remote <code>url()</code>, and script directives are stripped
        automatically.
      </span>
    </div>
  );
}
