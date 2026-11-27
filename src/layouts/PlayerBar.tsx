import {
  Disc3,
  Info,
  ListOrdered,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-react";
import { Button } from "../components/Button";
import { Slider } from "../components/Slider";
import type { RightPanelTab } from "./RightPanel";

const ENGINE_DISABLED_REASON = "Audio engine scheduled for Milestone 4";

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
  return (
    <footer className="aq-player-bar" aria-label="Playback deck">
      <div className="aq-player-track">
        <div className="aq-player-art" aria-hidden="true">
          <Disc3 size={22} />
        </div>
        <div className="aq-player-meta">
          <div className="aq-player-title">No track loaded</div>
          <div className="aq-player-sub">Audio engine scheduled for Milestone 4</div>
        </div>
      </div>

      <div className="aq-player-center">
        <div className="aq-player-transport">
          <Button
            size="icon"
            variant="ghost"
            disabled
            aria-label="Shuffle"
            title={ENGINE_DISABLED_REASON}
          >
            <Shuffle size={15} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            disabled
            aria-label="Previous track"
            title={ENGINE_DISABLED_REASON}
          >
            <SkipBack size={16} />
          </Button>
          <Button
            size="icon"
            variant="primary"
            disabled
            aria-label="Play"
            title={ENGINE_DISABLED_REASON}
          >
            <Play size={16} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            disabled
            aria-label="Next track"
            title={ENGINE_DISABLED_REASON}
          >
            <SkipForward size={16} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            disabled
            aria-label="Repeat"
            title={ENGINE_DISABLED_REASON}
          >
            <Repeat size={15} />
          </Button>
        </div>

        <div className="aq-player-scrubber">
          <span className="aq-timecode">00:00</span>
          <Slider
            label="Track progress"
            min={0}
            max={100}
            value={0}
            disabled
            readOnly
            title={ENGINE_DISABLED_REASON}
          />
          <span className="aq-timecode">00:00</span>
        </div>
      </div>

      <div className="aq-player-right">
        <div className="aq-volume-wrap">
          <Volume2 size={16} aria-hidden="true" style={{ color: "var(--aq-muted)" }} />
          <Slider
            label="Volume"
            min={0}
            max={100}
            value={80}
            disabled
            readOnly
            title={ENGINE_DISABLED_REASON}
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
