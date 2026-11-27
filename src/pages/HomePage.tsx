import { Play } from "lucide-react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Panel } from "../components/Panel";
import type { RuntimeStatus } from "../hooks/useAppInfo";
import { useLibraryStore } from "../stores/useLibraryStore";
import { usePlayerStore } from "../stores/usePlayerStore";
import type { AppInfo } from "../types/system";

interface HomePageProps {
  appInfo: AppInfo | null;
  runtimeStatus: RuntimeStatus;
  ipcError: string | null;
  onOpenSettings: () => void;
}

export function HomePage({ appInfo, runtimeStatus, ipcError, onOpenSettings }: HomePageProps) {
  const { tracks, albums, artists, folders, recentTracks } = useLibraryStore();
  const playTrackList = usePlayerStore((state) => state.playTrackList);

  return (
    <>
      <Panel
        title="Signal Deck"
        badge={<Badge tone="accent">v{appInfo?.version ?? "0.9.0"}</Badge>}
        ledActive={runtimeStatus === "tauri"}
        headerActions={
          <Button size="sm" variant="secondary" onClick={onOpenSettings}>
            Open Settings
          </Button>
        }
      >
        <div className="aq-hero-banner">
          <div>
            <h2 className="aq-hero-title">Auraliq</h2>
            <p className="aq-hero-sub">
              Your music. Your frequency. Local-first retro music hub built with Rust &amp; Tauri
              v2.
            </p>
          </div>
          <div className="aq-kv-list" style={{ minWidth: "320px" }}>
            <div className="aq-kv-item">
              <span className="aq-kv-label">Library</span>
              <span className="aq-kv-val">
                {tracks.length} tracks • {albums.length} albums
              </span>
            </div>
            <div className="aq-kv-item">
              <span className="aq-kv-label">Indexed</span>
              <span className="aq-kv-val">
                {artists.length} artists • {folders.length} folders
              </span>
            </div>
            <div className="aq-kv-item">
              <span className="aq-kv-label">Runtime</span>
              <span className="aq-kv-val">
                {appInfo ? `${appInfo.platform} (${appInfo.arch})` : "web-preview"}
              </span>
            </div>
            <div className="aq-kv-item">
              <span className="aq-kv-label">Milestone</span>
              <span className="aq-kv-val">M13 QA, Perf &amp; Security</span>
            </div>
          </div>
        </div>
        <div className="aq-row-wrap" style={{ marginTop: "1rem" }}>
          <span className="aq-kv-label" style={{ margin: 0 }}>
            Shortcuts:
          </span>
          <kbd className="aq-kbd">Ctrl+K</kbd>
          <span style={{ fontSize: "0.8rem", color: "var(--aq-muted)" }}>Search</span>
          <kbd className="aq-kbd">Ctrl+B</kbd>
          <span style={{ fontSize: "0.8rem", color: "var(--aq-muted)" }}>Sidebar</span>
          <kbd className="aq-kbd">?</kbd>
          <span style={{ fontSize: "0.8rem", color: "var(--aq-muted)" }}>All Shortcuts</span>
        </div>
        {ipcError && (
          <p
            role="alert"
            style={{ color: "var(--aq-warn)", marginTop: "0.75rem", marginBottom: 0 }}
          >
            IPC error: {ipcError}
          </p>
        )}
      </Panel>

      {recentTracks.length > 0 && (
        <Panel title="Recently Played" ledActive>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
            {recentTracks.slice(0, 6).map((track, idx) => (
              <div key={track.id} className="aq-list-row">
                <span className="aq-truncate">
                  <strong>{track.title}</strong> — {track.artist}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void playTrackList(recentTracks, idx)}
                >
                  <Play size={13} />
                  Play
                </Button>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </>
  );
}
