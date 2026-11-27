import {
  Disc3,
  Heart,
  Info,
  ListOrdered,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect } from "react";
import { formatDurationMs, resolveArtworkUrl } from "../api/backend";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Slider } from "../components/Slider";
import { useLibraryStore } from "../stores/useLibraryStore";
import { usePlayerStore } from "../stores/usePlayerStore";
import type { RightPanelTab } from "./RightPanel";

interface PlayerBarProps {
  rightPanelOpen: boolean;
  rightPanelTab: RightPanelTab;
  onToggleRightPanelTab: (tab: RightPanelTab) => void;
}

export function PlayerBar({
  rightPanelOpen,
  rightPanelTab,
  onToggleRightPanelTab,
}: PlayerBarProps) {
  const {
    currentTrack,
    status,
    positionMs,
    durationMs,
    volume,
    muted,
    shuffle,
    repeatMode,
    error,
    togglePlayPause,
    nextTrack,
    prevTrack,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeatMode,
    pollStatus,
  } = usePlayerStore();
  const toggleFavorite = useLibraryStore((state) => state.toggleFavorite);

  useEffect(() => {
    if (status !== "playing") {
      return;
    }
    const timer = window.setInterval(() => {
      void pollStatus();
    }, 250);
    return () => window.clearInterval(timer);
  }, [pollStatus, status]);

  const hasTrack = Boolean(currentTrack);
  const artworkUrl = resolveArtworkUrl(currentTrack?.artwork_path ?? null);
  const maxDuration = Math.max(1, durationMs || currentTrack?.duration_ms || 0);
  const noTrackReason = "Select a track from your library to play";

  return (
    <footer className="aq-player-bar" aria-label="Playback deck">
      <div className="aq-player-track">
        <div className="aq-player-art" aria-hidden="true">
          {artworkUrl ? (
            <img
              src={artworkUrl}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <Disc3 size={22} />
          )}
        </div>
        <div className="aq-player-meta">
          <div className="aq-player-title">
            {currentTrack ? currentTrack.title : "No track loaded"}
          </div>
          <div className="aq-player-sub">
            {error
              ? error
              : currentTrack
                ? `${currentTrack.artist} • ${currentTrack.album}`
                : "Add a local music folder in Library"}
          </div>
        </div>
        {currentTrack && (
          <>
            <Badge tone="accent">{currentTrack.source_provider.toUpperCase()}</Badge>
            <Button
              size="icon"
              variant="ghost"
              active={currentTrack.is_favorite}
              aria-label={currentTrack.is_favorite ? "Unfavorite track" : "Favorite track"}
              onClick={() => void toggleFavorite(currentTrack.id)}
            >
              <Heart size={15} />
            </Button>
          </>
        )}
      </div>

      <div className="aq-player-center">
        <div className="aq-player-transport">
          <Button
            size="icon"
            variant="ghost"
            active={shuffle}
            aria-label="Shuffle"
            title={shuffle ? "Shuffle: On" : "Shuffle: Off"}
            onClick={toggleShuffle}
          >
            <Shuffle size={15} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            disabled={!hasTrack}
            aria-label="Previous track"
            title={hasTrack ? "Previous track" : noTrackReason}
            onClick={() => void prevTrack()}
          >
            <SkipBack size={16} />
          </Button>
          <Button
            size="icon"
            variant="primary"
            disabled={!hasTrack}
            aria-label={status === "playing" ? "Pause" : "Play"}
            title={hasTrack ? (status === "playing" ? "Pause" : "Play") : noTrackReason}
            onClick={() => void togglePlayPause()}
          >
            {status === "playing" ? <Pause size={16} /> : <Play size={16} />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            disabled={!hasTrack}
            aria-label="Next track"
            title={hasTrack ? "Next track" : noTrackReason}
            onClick={() => void nextTrack()}
          >
            <SkipForward size={16} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            active={repeatMode !== "off"}
            aria-label="Repeat"
            title={`Repeat: ${repeatMode}`}
            onClick={cycleRepeatMode}
          >
            {repeatMode === "one" ? <Repeat1 size={15} /> : <Repeat size={15} />}
          </Button>
        </div>

        <div className="aq-player-scrubber">
          <span className="aq-timecode">{formatDurationMs(positionMs)}</span>
          <Slider
            label="Track progress"
            min={0}
            max={maxDuration}
            value={Math.min(positionMs, maxDuration)}
            disabled={!hasTrack}
            onChange={(e) => void seek(Number(e.target.value))}
          />
          <span className="aq-timecode">{formatDurationMs(durationMs)}</span>
        </div>
      </div>

      <div className="aq-player-right">
        <div className="aq-volume-wrap">
          <Button
            size="icon"
            variant="ghost"
            aria-label={muted ? "Unmute" : "Mute"}
            onClick={() => void toggleMute()}
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </Button>
          <Slider
            label="Volume"
            min={0}
            max={100}
            value={Math.round(volume * 100)}
            onChange={(e) => void setVolume(Number(e.target.value) / 100)}
          />
        </div>
        <Button
          size="icon"
          variant="ghost"
          active={rightPanelOpen && rightPanelTab === "queue"}
          aria-label="Toggle queue panel"
          title="Toggle queue panel"
          onClick={() => onToggleRightPanelTab("queue")}
        >
          <ListOrdered size={16} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          active={rightPanelOpen && rightPanelTab === "info"}
          aria-label="Toggle track info panel"
          title="Toggle track info panel"
          onClick={() => onToggleRightPanelTab("info")}
        >
          <Info size={16} />
        </Button>
      </div>
    </footer>
  );
}
