import { Download, ListMusic, Play, Plus, Sparkles, Trash2, Upload, X } from "lucide-react";
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
    smartPlaylists,
    createPlaylist,
    deletePlaylist,
    removeTrackFromPlaylist,
    importPlaylistFromDialog,
    exportPlaylistToDialog,
    createSmartPlaylist,
    deleteSmartPlaylist,
  } = useLibraryStore();
  const playTrackList = usePlayerStore((state) => state.playTrackList);

  const [newName, setNewName] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<TrackRecord[]>([]);

  const [smartName, setSmartName] = useState("");
  const [smartField, setSmartField] = useState("genre");
  const [smartOp, setSmartOp] = useState("contains");
  const [smartVal, setSmartVal] = useState("");
  const [selectedSmartId, setSelectedSmartId] = useState<number | null>(null);
  const [smartTracks, setSmartTracks] = useState<TrackRecord[]>([]);

  const activePlaylist = playlists.find((p) => p.id === selectedId) ?? playlists[0] ?? null;
  const activeSmart =
    smartPlaylists.find((s) => s.id === selectedSmartId) ?? smartPlaylists[0] ?? null;

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

  useEffect(() => {
    if (!activeSmart || !inTauri) {
      setSmartTracks([]);
      return;
    }
    let cancelled = false;
    void backendApi.getSmartPlaylistTracks(activeSmart.id).then((items) => {
      if (!cancelled) {
        setSmartTracks(items);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activeSmart, inTauri, smartPlaylists]);

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

  const handleCreateSmart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smartName.trim()) {
      return;
    }
    const created = await createSmartPlaylist(smartName, "all", [
      { field: smartField, operator: smartOp, value: smartVal },
    ]);
    setSmartName("");
    setSmartVal("");
    if (created) {
      setSelectedSmartId(created.id);
    }
  };

  return (
    <>
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

      <Panel title="Smart Playlists" badge={<Badge>{smartPlaylists.length}</Badge>} ledActive>
        <form
          onSubmit={(e) => void handleCreateSmart(e)}
          className="aq-row-wrap"
          style={{ marginBottom: "1rem" }}
        >
          <input
            type="text"
            className="aq-input"
            style={{ width: "170px" }}
            placeholder="Smart rule name..."
            aria-label="Smart playlist name"
            disabled={!inTauri}
            value={smartName}
            onChange={(e) => setSmartName(e.target.value)}
          />
          <select
            aria-label="Rule field"
            className="aq-select"
            value={smartField}
            onChange={(e) => setSmartField(e.target.value)}
          >
            <option value="genre">Genre</option>
            <option value="artist">Artist</option>
            <option value="favorite">Favorite</option>
            <option value="play_count">Play Count</option>
            <option value="duration_sec">Duration (sec)</option>
          </select>
          <select
            aria-label="Rule operator"
            className="aq-select"
            value={smartOp}
            onChange={(e) => setSmartOp(e.target.value)}
          >
            <option value="contains">Contains</option>
            <option value="equals">Equals</option>
            <option value="gte">&gt;=</option>
            <option value="lte">&lt;=</option>
            <option value="is_true">Is True</option>
          </select>
          <input
            type="text"
            className="aq-input"
            style={{ width: "140px" }}
            placeholder="Value..."
            aria-label="Rule value"
            disabled={!inTauri}
            value={smartVal}
            onChange={(e) => setSmartVal(e.target.value)}
          />
          <Button
            type="submit"
            size="sm"
            variant="primary"
            disabled={!inTauri || !smartName.trim()}
          >
            <Sparkles size={14} />
            Add Smart Rule
          </Button>
        </form>

        <div className="aq-grid-2">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
            {smartPlaylists.map((sp) => (
              <div
                key={sp.id}
                className="aq-list-row"
                style={activeSmart?.id === sp.id ? { borderColor: "var(--aq-accent)" } : undefined}
              >
                <button
                  type="button"
                  className="aq-btn aq-btn--ghost aq-truncate"
                  style={{ flex: 1, justifyContent: "flex-start" }}
                  onClick={() => setSelectedSmartId(sp.id)}
                >
                  <Sparkles size={13} />
                  <strong className="aq-truncate">{sp.name}</strong>
                </button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Delete smart playlist ${sp.name}`}
                  onClick={() => void deleteSmartPlaylist(sp.id)}
                >
                  <Trash2 size={13} />
                </Button>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
            {smartTracks.length === 0 ? (
              <EmptyState
                icon={<Sparkles size={20} />}
                title={activeSmart ? `${activeSmart.name} (0 matches)` : "Select a Smart Playlist"}
                description="Smart playlists dynamically evaluate rules against your SQLite library."
              />
            ) : (
              <>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => void playTrackList(smartTracks, 0)}
                >
                  <Play size={14} />
                  Play All ({smartTracks.length})
                </Button>
                {smartTracks.slice(0, 12).map((t, idx) => (
                  <div key={t.id} className="aq-list-row">
                    <button
                      type="button"
                      className="aq-btn aq-btn--ghost aq-truncate"
                      style={{ flex: 1, justifyContent: "flex-start" }}
                      onClick={() => void playTrackList(smartTracks, idx)}
                    >
                      <Play size={12} />
                      <span className="aq-truncate">{t.title}</span>
                    </button>
                    <span className="aq-timecode">{formatDurationMs(t.duration_ms)}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </Panel>
    </>
  );
}
