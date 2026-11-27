import { ListMusic, Plus, Upload } from "lucide-react";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Panel } from "../components/Panel";

const PLAYLIST_DISABLED_REASON = "Playlist storage activates in Milestone 4";

export function PlaylistsPage() {
  return (
    <Panel
      title="Playlists"
      headerActions={
        <div className="aq-row-wrap">
          <Button size="sm" variant="secondary" disabled title={PLAYLIST_DISABLED_REASON}>
            <Upload size={14} />
            Import M3U / PLS
          </Button>
          <Button size="sm" variant="primary" disabled title={PLAYLIST_DISABLED_REASON}>
            <Plus size={14} />
            New Playlist
          </Button>
        </div>
      }
    >
      <EmptyState
        icon={<ListMusic size={20} />}
        title="No Playlists Yet"
        description="Local playlists, drag-and-drop ordering, and M3U/M3U8/PLS import & export will be enabled in Milestone 4. Smart playlist rules arrive in Milestone 6."
        milestoneTag="Milestone 4 / 6"
      />
    </Panel>
  );
}
