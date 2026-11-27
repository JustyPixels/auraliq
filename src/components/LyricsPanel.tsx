import { Music2, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { backendApi, formatDurationMs, isTauriRuntime } from "../api/backend";
import { usePlayerStore } from "../stores/usePlayerStore";
import type { LyricsResult } from "../types/music";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";

export function LyricsPanel() {
  const { currentTrack, positionMs, lrclibEnabled, seek, setLrclibEnabled } = usePlayerStore();
  const [lyrics, setLyrics] = useState<LyricsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inTauri = isTauriRuntime();

  useEffect(() => {
    if (!currentTrack || !inTauri) {
      setLyrics(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void backendApi
      .getTrackLyrics(
        currentTrack.title,
        currentTrack.artist,
        currentTrack.album,
        currentTrack.duration_ms,
        currentTrack.file_path,
      )
      .then((res) => {
        if (!cancelled) {
          setLyrics(res);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentTrack, inTauri, lrclibEnabled]);

  const activeLineIndex = useMemo(() => {
    if (!lyrics || lyrics.synced_lines.length === 0) {
      return -1;
    }
    let active = -1;
    for (let i = 0; i < lyrics.synced_lines.length; i++) {
      if (lyrics.synced_lines[i].time_ms <= positionMs) {
        active = i;
      } else {
        break;
      }
    }
    return active;
  }, [lyrics, positionMs]);

  if (!currentTrack) {
    return (
      <EmptyState
        icon={<Music2 size={20} />}
        title="No Track Loaded"
        description="Play a track to view local .lrc sidecar lyrics or optional opt-in LRCLIB synced lyrics."
      />
    );
  }

  if (!inTauri) {
    return (
      <EmptyState
        icon={<Music2 size={20} />}
        title="Lyrics Ready on Desktop"
        description="Local .lrc sidecars and opt-in LRCLIB synced lyrics run via the desktop backend."
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div className="aq-row-wrap" style={{ justifyContent: "space-between" }}>
        <Badge tone="accent">
          {lyrics?.source === "local_lrc"
            ? "Local .LRC"
            : lyrics?.source === "lrclib"
              ? "LRCLIB"
              : lrclibEnabled
                ? "LRCLIB Opt-In"
                : "Offline Only"}
        </Badge>
        <Button
          size="sm"
          variant="ghost"
          active={lrclibEnabled}
          onClick={() => void setLrclibEnabled(!lrclibEnabled)}
        >
          <Sparkles size={13} />
          LRCLIB: {lrclibEnabled ? "On" : "Off"}
        </Button>
      </div>

      {loading && <span style={{ fontSize: "0.82rem", color: "var(--aq-muted)" }}>Loading...</span>}
      {error && (
        <p role="alert" style={{ color: "var(--aq-warn)", margin: 0, fontSize: "0.82rem" }}>
          {error}
        </p>
      )}

      {!loading && lyrics?.source === "disabled" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
          <EmptyState
            icon={<Sparkles size={20} />}
            title="Online Lyrics Disabled (Opt-In)"
            description="No external lyrics requests are sent unless you opt in. Local .lrc sidecar files still load automatically offline."
          />
          <Button size="sm" variant="primary" onClick={() => void setLrclibEnabled(true)}>
            Enable LRCLIB Lyrics
          </Button>
        </div>
      )}

      {!loading && lyrics?.instrumental && <Badge tone="ok">Instrumental Track (No Vocals)</Badge>}

      {!loading && lyrics && lyrics.synced_lines.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          {lyrics.synced_lines.map((line, idx) => {
            const isActive = idx === activeLineIndex;
            return (
              <button
                key={`${line.time_ms}-${idx}`}
                type="button"
                className={`aq-list-row ${isActive ? "aq-track-row--active" : ""}`}
                style={{
                  textAlign: "left",
                  cursor: "pointer",
                  width: "100%",
                  borderColor: isActive ? "var(--aq-accent)" : undefined,
                }}
                onClick={() => void seek(line.time_ms)}
              >
                <span style={{ fontSize: "0.82rem", flex: 1 }}>{line.text || "♪"}</span>
                <span className="aq-timecode">{formatDurationMs(line.time_ms)}</span>
              </button>
            );
          })}
        </div>
      )}

      {!loading &&
        lyrics &&
        lyrics.synced_lines.length === 0 &&
        lyrics.plain_lyrics &&
        !lyrics.instrumental && (
          <pre
            style={{
              margin: 0,
              whiteSpace: "pre-wrap",
              fontFamily: "var(--aq-font-sans)",
              fontSize: "0.84rem",
              lineHeight: 1.5,
            }}
          >
            {lyrics.plain_lyrics}
          </pre>
        )}

      {!loading && lyrics?.source === "not_found" && (
        <EmptyState
          icon={<Music2 size={20} />}
          title="No Lyrics Found"
          description="Neither a local .lrc sidecar nor an LRCLIB match was found for this track."
        />
      )}
    </div>
  );
}
