import { ArrowDown, ArrowUp, Info, ListOrdered, Play, Trash2, X } from "lucide-react";
import { formatDurationMs } from "../api/backend";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { LyricsPanel } from "../components/LyricsPanel";
import { usePlayerStore } from "../stores/usePlayerStore";
import { AudioVisualizer } from "../visualizers/AudioVisualizer";

export type RightPanelTab = "queue" | "info" | "visualizer" | "lyrics";

interface RightPanelProps {
  activeTab: RightPanelTab;
  onSelectTab: (tab: RightPanelTab) => void;
  onClose: () => void;
}

export function RightPanel({ activeTab, onSelectTab, onClose }: RightPanelProps) {
  const {
    queue,
    queueIndex,
    currentTrack,
    playQueueIndex,
    moveQueueItem,
    removeFromQueue,
    clearQueue,
  } = usePlayerStore();

  return (
    <aside className="aq-right-panel" aria-label="Context panel">
      <header className="aq-right-panel__header">
        <div className="aq-right-panel__tabs" role="tablist" aria-label="Panel views">
          <Button
            size="sm"
            variant="ghost"
            active={activeTab === "queue"}
            role="tab"
            aria-selected={activeTab === "queue"}
            onClick={() => onSelectTab("queue")}
          >
            Queue
          </Button>
          <Button
            size="sm"
            variant="ghost"
            active={activeTab === "info"}
            role="tab"
            aria-selected={activeTab === "info"}
            onClick={() => onSelectTab("info")}
          >
            Info
          </Button>
          <Button
            size="sm"
            variant="ghost"
            active={activeTab === "visualizer"}
            role="tab"
            aria-selected={activeTab === "visualizer"}
            onClick={() => onSelectTab("visualizer")}
          >
            Scope
          </Button>
          <Button
            size="sm"
            variant="ghost"
            active={activeTab === "lyrics"}
            role="tab"
            aria-selected={activeTab === "lyrics"}
            onClick={() => onSelectTab("lyrics")}
          >
            Lyrics
          </Button>
        </div>

        <Button
          size="icon"
          variant="ghost"
          aria-label="Close right panel"
          title="Close right panel"
          onClick={onClose}
        >
          <X size={15} />
        </Button>
      </header>

      <div className="aq-right-panel__body">
        {activeTab === "queue" &&
          (queue.length === 0 ? (
            <EmptyState
              icon={<ListOrdered size={20} />}
              title="Playback Queue Empty"
              description="Play a track or add items from your library to build the queue."
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div className="aq-row-wrap" style={{ justifyContent: "space-between" }}>
                <Badge>{queue.length} queued</Badge>
                <Button size="sm" variant="ghost" onClick={() => void clearQueue()}>
                  <Trash2 size={13} />
                  Clear
                </Button>
              </div>
              {queue.map((track, idx) => (
                <div
                  key={`${track.id}-${idx}`}
                  className="aq-list-row"
                  style={idx === queueIndex ? { borderColor: "var(--aq-accent)" } : undefined}
                >
                  <button
                    type="button"
                    className="aq-btn aq-btn--ghost aq-truncate"
                    style={{ flex: 1, justifyContent: "flex-start", padding: "0.2rem" }}
                    onClick={() => void playQueueIndex(idx)}
                  >
                    <Play size={12} />
                    <span className="aq-truncate">{track.title}</span>
                  </button>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={idx === 0}
                    aria-label={`Move ${track.title} up in queue`}
                    onClick={() => moveQueueItem(idx, idx - 1)}
                  >
                    <ArrowUp size={12} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={idx === queue.length - 1}
                    aria-label={`Move ${track.title} down in queue`}
                    onClick={() => moveQueueItem(idx, idx + 1)}
                  >
                    <ArrowDown size={12} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Remove ${track.title} from queue`}
                    onClick={() => removeFromQueue(idx)}
                  >
                    <X size={13} />
                  </Button>
                </div>
              ))}
            </div>
          ))}

        {activeTab === "info" &&
          (currentTrack ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
              <div className="aq-kv-item">
                <span className="aq-kv-label">Title</span>
                <span className="aq-kv-val">{currentTrack.title}</span>
              </div>
              <div className="aq-kv-item">
                <span className="aq-kv-label">Artist / Album</span>
                <span className="aq-kv-val">
                  {currentTrack.artist} — {currentTrack.album}
                </span>
              </div>
              <div className="aq-kv-item">
                <span className="aq-kv-label">Format</span>
                <span className="aq-kv-val">
                  {currentTrack.format.toUpperCase()} •{" "}
                  {currentTrack.sample_rate_hz ? `${currentTrack.sample_rate_hz} Hz` : "N/A"} •{" "}
                  {currentTrack.bitrate_kbps ? `${currentTrack.bitrate_kbps} kbps` : "Lossless"}
                </span>
              </div>
              <div className="aq-kv-item">
                <span className="aq-kv-label">Duration / Plays</span>
                <span className="aq-kv-val">
                  {formatDurationMs(currentTrack.duration_ms)} • {currentTrack.play_count} plays
                </span>
              </div>
              <div className="aq-kv-item">
                <span className="aq-kv-label">File Path</span>
                <span className="aq-kv-val" style={{ wordBreak: "break-all", fontSize: "0.74rem" }}>
                  {currentTrack.file_path}
                </span>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<Info size={20} />}
              title="No Track Selected"
              description="Play a track to inspect its audio format, bitrate, sample rate, and file path."
            />
          ))}

        {activeTab === "visualizer" && <AudioVisualizer />}
        {activeTab === "lyrics" && <LyricsPanel />}
      </div>
    </aside>
  );
}
