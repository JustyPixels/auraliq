import { Download, ListMusic, Play, Plus, Trash2, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import { backendApi, formatDurationMs, isTauriRuntime } from "../api/backend";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Panel } from "../components/Panel";
import { useLibraryStore } from "../stores/useLibraryStore";
import { usePlayerStore } from "../stores/usePlayerStore";
import type { TrackRecord } from "../types/music";

const DESKTOP_REQUIRED_TIP = "Requires desktop Tauri runtime";

export function PlaylistsPage() {
  const inTauri = isTauriRuntime();
  const {
    playlists,
    createPlaylist,
    deletePlaylist,
    removeTrackFromPlaylist,
    importPlaylistFromDialog,
    exportPlaylistToDialog,
  } = useLibraryStore();
  const playTrackList = usePlayerStore((state) => state.playTrackList);

  const [newName, setNewName] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<TrackRecord[]>([]);

  const activePlaylist = playlists.find((p) => p.id === selectedId) ?? playlists[0] ?? null;

  useEffect(() => {
    if (!activePlaylist || !inTauri) {
      setPlaylistTracks([]);
      return;
    }
    let cancelled = false;
    void backendApi.getPlaylistTracks(activePlaylist.id).then((items) => {
      if (!cancelled) {
        setPlaylistTracks(items);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activePlaylist, inTauri, playlists]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      return;
    }
    const created = await createPlaylist(newName);
    setNewName("");
    if (created) {
      setSelectedId(created.id);
    }
  };

  return (
    <div className="aq-grid-2">
      <Panel
        title="Playlists"
        badge={<Badge>{playlists.length}</Badge>}
        headerActions={
          <Button
            size="sm"
            variant="secondary"
            disabled={!inTauri}
            title={!inTauri ? DESKTOP_REQUIRED_TIP : "Import M3U, M3U8, or PLS playlist"}
            onClick={() => void importPlaylistFromDialog()}
          >
            <Upload size={14} />
            Import M3U / PLS
          </Button>
        }
      >
        <form
          onSubmit={(e) => void handleCreate(e)}
          className="aq-row-wrap"
          style={{ marginBottom: "1rem" }}
        >
          <input
            type="text"
            className="aq-input"
            style={{ flex: 1, minWidth: "160px" }}
            placeholder="New playlist name..."
            aria-label="New playlist name"
            value={newName}
            disabled={!inTauri}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Button
            type="submit"
            size="sm"
            variant="primary"
            disabled={!inTauri || !newName.trim()}
            title={!inTauri ? DESKTOP_REQUIRED_TIP : "Create playlist"}
          >
            <Plus size={14} />
            New Playlist
          </Button>
        </form>

        {playlists.length === 0 ? (
          <EmptyState
            icon={<ListMusic size={20} />}
            title="No Playlists Yet"
            description="Create a local playlist or import an existing M3U/M3U8/PLS file."
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
            {playlists.map((pl) => (
              <div
                key={pl.id}
                className="aq-list-row"
                style={
                  activePlaylist?.id === pl.id ? { borderColor: "var(--aq-accent)" } : undefined
                }
              >
                <button
                  type="button"
                  className="aq-btn aq-btn--ghost aq-truncate"
                  style={{ flex: 1, justifyContent: "flex-start" }}
                  onClick={() => setSelectedId(pl.id)}
                >
                  <strong className="aq-truncate">{pl.name}</strong>
                  <Badge>{pl.track_count}</Badge>
                </button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Export ${pl.name}`}
                  title="Export M3U8 / PLS"
                  onClick={() => void exportPlaylistToDialog(pl)}
                >
                  <Download size={14} />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Delete ${pl.name}`}
                  onClick={() => void deletePlaylist(pl.id)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel
        title={activePlaylist ? activePlaylist.name : "Playlist Tracks"}
        headerActions={
          activePlaylist && playlistTracks.length > 0 ? (
            <Button
              size="sm"
              variant="primary"
              onClick={() => void playTrackList(playlistTracks, 0)}
            >
              <Play size={14} />
              Play All
            </Button>
          ) : undefined
        }
      >
        {!activePlaylist || playlistTracks.length === 0 ? (
          <EmptyState
            icon={<ListMusic size={20} />}
            title="No Tracks in Playlist"
            description="Add tracks from your Local Library using the '+ Playlist' selector."
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
            {playlistTracks.map((track, idx) => (
              <div key={track.id} className="aq-list-row">
                <button
                  type="button"
                  className="aq-btn aq-btn--ghost aq-truncate"
                  style={{ flex: 1, justifyContent: "flex-start" }}
                  onClick={() => void playTrackList(playlistTracks, idx)}
                >
                  <Play size={13} />
                  <span className="aq-truncate">
                    {track.title} — {track.artist}
                  </span>
                </button>
                <span className="aq-timecode">{formatDurationMs(track.duration_ms)}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Remove ${track.title}`}
                  onClick={() => void removeTrackFromPlaylist(activePlaylist.id, track.id)}
                >
                  <X size={13} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
