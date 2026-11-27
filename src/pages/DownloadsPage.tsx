import { Download, HardDrive } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { Panel } from "../components/Panel";

export function DownloadsPage() {
  return (
    <div className="aq-grid-2">
      <Panel title="Download Queue">
        <EmptyState
          icon={<Download size={20} />}
          title="Download Manager Scheduled"
          description="Source-aware downloads (pause, resume, retry, Lofty tag embedding) activate in Milestone 9 exclusively for permitted open sources like Internet Archive and CC-licensed Jamendo tracks—never YouTube, Spotify, or SoundCloud."
          milestoneTag="Milestone 9"
        />
      </Panel>

      <Panel title="Temporary Playback Cache">
        <EmptyState
          icon={<HardDrive size={20} />}
          title="LRU Cache Scheduled"
          description="Configurable temporary audio stream caching (max size, TTL expiration, low-disk cleanup) arrives in Milestone 9. Cached streams are never presented as permanent downloads."
          milestoneTag="Milestone 9"
        />
      </Panel>
    </div>
  );
}
