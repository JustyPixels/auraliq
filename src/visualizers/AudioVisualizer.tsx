import { useEffect, useRef } from "react";
import { backendApi, isTauriRuntime } from "../api/backend";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { usePlayerStore } from "../stores/usePlayerStore";
import { useThemeStore } from "../stores/useThemeStore";
import type { VisualizerFrame, VisualizerStyle } from "../types/music";

const EMPTY_FRAME: VisualizerFrame = {
  bars: new Array(24).fill(0),
  waveform: new Array(32).fill(0),
  peak: 0,
};

function drawVuMeter(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  level: number,
  label: string,
  accent: string,
  secondary: string,
  muted: string,
  warn: string,
) {
  ctx.strokeStyle = muted;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(cx - radius - 8, cy - radius - 10, (radius + 8) * 2, radius + 24);

  ctx.beginPath();
  ctx.arc(cx, cy, radius - 4, Math.PI * 1.15, Math.PI * 1.85);
  ctx.strokeStyle = secondary;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, radius - 4, Math.PI * 1.68, Math.PI * 1.85);
  ctx.strokeStyle = warn;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  const angle = Math.PI * 1.15 + Math.min(1, Math.max(0, level)) * Math.PI * 0.7;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(angle) * (radius - 8), cy + Math.sin(angle) * (radius - 8));
  ctx.stroke();

  ctx.fillStyle = muted;
  ctx.font = "10px monospace";
  ctx.fillText(label, cx - 4, cy + 10);
}

export function AudioVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<VisualizerFrame>(EMPTY_FRAME);
  const peakHoldRef = useRef<number[]>(new Array(24).fill(0));
  const angleRef = useRef(0);

  const {
    status,
    visualizerStyle,
    lowPerformanceVisualizer,
    setVisualizerStyle,
    setLowPerformanceVisualizer,
  } = usePlayerStore();
  const reducedMotion = useThemeStore((state) => state.reducedMotion);

  useEffect(() => {
    if (status !== "playing" || !isTauriRuntime()) {
      frameRef.current = EMPTY_FRAME;
      return;
    }

    const intervalMs = lowPerformanceVisualizer ? 120 : 66;
    const timer = window.setInterval(() => {
      void backendApi.getVisualizerFrame().then((frame) => {
        frameRef.current = frame;
      });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [lowPerformanceVisualizer, status]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    let rafId = 0;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      const styles = getComputedStyle(document.documentElement);
      const bg = styles.getPropertyValue("--aq-surface-inset").trim() || "#080410";
      const accent = styles.getPropertyValue("--aq-accent").trim() || "#a855f7";
      const secondary = styles.getPropertyValue("--aq-secondary-accent").trim() || "#22d3ee";
      const muted = styles.getPropertyValue("--aq-border-highlight").trim() || "#6b4ca8";
      const warn = styles.getPropertyValue("--aq-warn").trim() || "#fbbf24";

      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const frame = frameRef.current;

      if (visualizerStyle === "bars") {
        // 90s Winamp-style segmented LED bricks
        const count = frame.bars.length;
        const gap = 2;
        const barW = Math.max(4, (w - gap * (count + 1)) / count);
        const segH = 4;
        const segGap = 2;

        for (let i = 0; i < count; i++) {
          const val = frame.bars[i] ?? 0;
          peakHoldRef.current[i] = Math.max(val, (peakHoldRef.current[i] ?? 0) * 0.94);
          const barH = Math.max(4, val * (h - 18));
          const x = gap + i * (barW + gap);
          const segments = Math.floor(barH / (segH + segGap));

          for (let s = 0; s < segments; s++) {
            const sy = h - 8 - (s + 1) * (segH + segGap);
            ctx.fillStyle = s > 15 ? warn : accent;
            ctx.fillRect(x, sy, barW, segH);
          }

          const peakY = h - 8 - peakHoldRef.current[i] * (h - 18);
          ctx.fillStyle = secondary;
          ctx.fillRect(x, peakY - 2, barW, 2);
        }
      } else if (visualizerStyle === "scope") {
        ctx.strokeStyle = muted;
        ctx.lineWidth = 1;
        for (let gx = 1; gx < 6; gx++) {
          ctx.beginPath();
          ctx.moveTo((w / 6) * gx, 0);
          ctx.lineTo((w / 6) * gx, h);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
        ctx.stroke();

        ctx.strokeStyle = secondary;
        ctx.lineWidth = 2;
        ctx.beginPath();
        const pts = frame.waveform;
        for (let i = 0; i < pts.length; i++) {
          const x = (i / Math.max(1, pts.length - 1)) * w;
          const y = h / 2 - (pts[i] ?? 0) * (h * 0.42);
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      } else if (visualizerStyle === "vu") {
        const leftLevel =
          frame.bars.slice(0, 12).reduce((a, b) => a + b, 0) / 12 || frame.peak * 0.9;
        const rightLevel =
          frame.bars.slice(12).reduce((a, b) => a + b, 0) / 12 || frame.peak * 0.85;
        drawVuMeter(ctx, w * 0.27, h * 0.68, 44, leftLevel, "L", accent, secondary, muted, warn);
        drawVuMeter(ctx, w * 0.73, h * 0.68, 44, rightLevel, "R", accent, secondary, muted, warn);
      } else if (visualizerStyle === "crt-matrix") {
        const cols = 16;
        const rows = 10;
        const cellW = (w - 16) / cols;
        const cellH = (h - 16) / rows;
        for (let c = 0; c < cols; c++) {
          const val = frame.bars[c] ?? 0;
          const activeRows = Math.round(val * rows);
          for (let r = 0; r < rows; r++) {
            const lit = rows - 1 - r < activeRows;
            ctx.fillStyle = lit ? (r < 2 ? warn : r < 5 ? secondary : accent) : "#140d22";
            ctx.fillRect(8 + c * cellW + 1, 8 + r * cellH + 1, cellW - 2, cellH - 2);
          }
        }
      } else {
        if (status === "playing" && !reducedMotion) {
          angleRef.current += lowPerformanceVisualizer ? 0.03 : 0.06;
        }
        const centers = [w * 0.3, w * 0.7];
        const cy = h * 0.48;
        const r = Math.min(w, h) * 0.22;

        ctx.strokeStyle = muted;
        ctx.lineWidth = 2;
        ctx.strokeRect(14, 14, w - 28, h - 42);
        ctx.strokeRect(w * 0.38, cy - 10, w * 0.24, 20);

        for (const cx of centers) {
          ctx.strokeStyle = accent;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();

          for (let s = 0; s < 3; s++) {
            const a = angleRef.current + (s * Math.PI * 2) / 3;
            ctx.strokeStyle = secondary;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(a) * (r - 4), cy + Math.sin(a) * (r - 4));
            ctx.stroke();
          }
        }

        // Integrated L/R level bar at bottom of cassette deck
        const levelW = (w - 32) * Math.min(1, frame.peak);
        ctx.fillStyle = accent;
        ctx.fillRect(16, h - 20, levelW, 8);
      }

      if (status === "playing" && !reducedMotion) {
        rafId = window.requestAnimationFrame(draw);
      }
    };

    draw();
    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [lowPerformanceVisualizer, reducedMotion, status, visualizerStyle]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div className="aq-row-wrap" style={{ justifyContent: "space-between" }}>
        <div className="aq-row-wrap" role="group" aria-label="Visualizer style">
          {(
            [
              ["bars", "Bars"],
              ["scope", "Scope"],
              ["cassette", "Cassette"],
              ["vu", "VU"],
              ["crt-matrix", "Matrix"],
            ] as readonly [VisualizerStyle, string][]
          ).map(([id, label]) => (
            <Button
              key={id}
              size="sm"
              variant="secondary"
              active={visualizerStyle === id}
              onClick={() => setVisualizerStyle(id)}
            >
              {label}
            </Button>
          ))}
        </div>
        <Badge tone={status === "playing" ? "ok" : "neutral"}>
          {status === "playing" ? "LIVE" : "STANDBY"}
        </Badge>
      </div>

      <canvas
        ref={canvasRef}
        width={252}
        height={148}
        className="aq-visualizer-canvas"
        aria-label="Audio visualizer"
      />

      <Button
        size="sm"
        variant="ghost"
        active={lowPerformanceVisualizer}
        onClick={() => setLowPerformanceVisualizer(!lowPerformanceVisualizer)}
      >
        Low-Performance Mode: {lowPerformanceVisualizer ? "On" : "Off"}
      </Button>
    </div>
  );
}
