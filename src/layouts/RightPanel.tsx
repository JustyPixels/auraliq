import { AudioLines, Info, ListOrdered, X } from "lucide-react";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";

export type RightPanelTab = "queue" | "info" | "visualizer";

interface RightPanelProps {
  activeTab: RightPanelTab;
  onSelectTab: (tab: RightPanelTab) => void;
  onClose: () => void;
}

export function RightPanel({ activeTab, onSelectTab, onClose }: RightPanelProps) {
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
        {activeTab === "queue" && (
          <EmptyState
            icon={<ListOrdered size={20} />}
            title="Playback Queue Empty"
            description="Queue management activates once the Rust audio engine lands."
            milestoneTag="Milestone 4 / 5"
          />
        )}
        {activeTab === "info" && (
          <EmptyState
            icon={<Info size={20} />}
            title="No Track Selected"
            description="Track metadata, audio format, bitrate, and source capabilities will appear here."
            milestoneTag="Milestone 4"
          />
        )}
        {activeTab === "visualizer" && (
          <EmptyState
            icon={<AudioLines size={20} />}
            title="Visualizer Standby"
            description="Real-time FFT spectrum and CRT oscilloscope render here during active playback."
            milestoneTag="Milestone 5"
          />
        )}
      </div>
    </aside>
  );
}
