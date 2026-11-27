import {
  Disc3,
  FileMusic,
  FolderPlus,
  Heart,
  Library,
  ListPlus,
  Mic2,
  Play,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { formatDurationMs, isTauriRuntime, resolveArtworkUrl } from "../api/backend";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Panel } from "../components/Panel";
import { type LibrarySort, useLibraryStore } from "../stores/useLibraryStore";
import { usePlayerStore } from "../stores/usePlayerStore";
import type { TrackRecord } from "../types/music";

export type LibraryTabId = "library" | "local" | "artists" | "albums" | "favorites" | "recent";

const LIBRARY_TABS: readonly { id: LibraryTabId; label: string }[] = [
  { id: "library", label: "All Music" },
  { id: "local", label: "Local Folders" },
  { id: "artists", label: "Artists" },
  { id: "albums", label: "Albums" },
  { id: "favorites", label: "Favorites" },
  { id: "recent", label: "Recently Played" },
];

const DESKTOP_REQUIRED_TIP = "Requires desktop Tauri runtime";

interface LibraryShellPageProps {
  initialTab: LibraryTabId;
}

export function LibraryShellPage({ initialTab }: LibraryShellPageProps) {
  const [tab, setTab] = useState<LibraryTabId>(initialTab);
  const inTauri = isTauriRuntime();

  const {
    folders,
    tracks,
    artists,
    albums,
    recentTracks,
    playlists,
    sortBy,
    scanning,
    lastScan,
    error,
    setSortBy,
    addFolderFromDialog,
    removeFolder,
    scanLibrary,
    toggleFavorite,
    addTrackToPlaylist,
  } = useLibraryStore();

  const { currentTrack, playTrackList, addToQueue } = usePlayerStore();

  const displayedTracks: TrackRecord[] =
    tab === "favorites"
      ? tracks.filter((t) => t.is_favorite)
      : tab === "recent"
        ? recentTracks
        : tracks;

  const renderTrackList = (items: TrackRecord[], emptyTitle: string, emptyDesc: string) => {
    if (items.length === 0) {
      return (
        <EmptyState
          icon={tab === "favorites" ? <Heart size={20} /> : <Library size={20} />}
          title={emptyTitle}
          description={emptyDesc}
        />
      );
    }

    return (
      <div className="aq-track-list">
        {items.map((track, idx) => {
          const artUrl = resolveArtworkUrl(track.artwork_path);
          const isActive = currentTrack?.id === track.id;
          return (
            <div
              key={track.id}
              className={`aq-track-row ${isActive ? "aq-track-row--active" : ""}`}
            >
              <div className="aq-thumb">
                {artUrl ? <img src={artUrl} alt="" /> : <FileMusic size={16} />}
              </div>
              <div className="aq-truncate">
                <div className="aq-truncate" style={{ fontWeight: 600, fontSize: "0.88rem" }}>
                  {track.title}
                </div>
                <div
                  className="aq-truncate"
                  style={{ fontSize: "0.76rem", color: "var(--aq-muted)" }}
                >
                  {track.artist}
                </div>
              </div>
              <div
                className="aq-truncate"
                style={{ fontSize: "0.82rem", color: "var(--aq-muted)" }}
              >
                {track.album}
              </div>
              <Badge>{track.format.toUpperCase()}</Badge>
              <span className="aq-timecode">{formatDurationMs(track.duration_ms)}</span>
              <div className="aq-row-wrap">
                <Button
                  size="icon"
                  variant="primary"
                  aria-label={`Play ${track.title}`}
                  onClick={() => void playTrackList(items, idx)}
                >
                  <Play size={14} />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Add ${track.title} to queue`}
                  title="Add to queue"
                  onClick={() => addToQueue(track)}
                >
                  <ListPlus size={14} />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  active={track.is_favorite}
                  aria-label={`Toggle favorite for ${track.title}`}
                  onClick={() => void toggleFavorite(track.id)}
                >
                  <Heart size={14} />
                </Button>
                {playlists.length > 0 && (
                  <select
                    aria-label={`Add ${track.title} to playlist`}
                    className="aq-select"
                    defaultValue=""
                    onChange={(e) => {
                      const pid = Number(e.target.value);
                      if (pid > 0) {
                        void addTrackToPlaylist(pid, track.id);
                      }
                      e.target.value = "";
                    }}
                  >
                    <option value="">+ Playlist</option>
                    {playlists.map((pl) => (
                      <option key={pl.id} value={pl.id}>
                        {pl.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Panel
      title="Local Library"
      ledActive={folders.length > 0}
      badge={<Badge>{tracks.length} tracks</Badge>}
      headerActions={
        <div className="aq-row-wrap">
          <select
            aria-label="Sort library"
            className="aq-select"
            value={sortBy}
            onChange={(e) => void setSortBy(e.target.value as LibrarySort)}
          >
            <option value="title">Sort: Title</option>
            <option value="artist">Sort: Artist</option>
            <option value="recent">Sort: Date Added</option>
          </select>
          <Button
            size="sm"
            variant="secondary"
            disabled={!inTauri || scanning || folders.length === 0}
            title={!inTauri ? DESKTOP_REQUIRED_TIP : "Rescan library folders"}
            onClick={() => void scanLibrary()}
          >
            <RefreshCw size={14} />
            {scanning ? "Scanning..." : "Rescan"}
          </Button>
          <Button
            size="sm"
            variant="primary"
            disabled={!inTauri || scanning}
            title={!inTauri ? DESKTOP_REQUIRED_TIP : "Add a local music folder"}
            onClick={() => void addFolderFromDialog()}
          >
            <FolderPlus size={14} />
            Add Music Folder
          </Button>
        </div>
      }
    >
      <div className="aq-tabs" role="tablist" aria-label="Library sections">
        {LIBRARY_TABS.map((item) => (
          <Button
            key={item.id}
            size="sm"
            variant="ghost"
            active={tab === item.id}
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {error && (
        <p role="alert" style={{ color: "var(--aq-warn)", marginTop: "0.75rem" }}>
          {error}
        </p>
      )}

      {lastScan && (
        <div className="aq-row-wrap" style={{ marginTop: "0.75rem" }}>
          <Badge tone="ok">Scanned {lastScan.scanned_files} files</Badge>
          <Badge>+{lastScan.added} added</Badge>
          <Badge>{lastScan.updated} updated</Badge>
          {lastScan.missing > 0 && <Badge tone="warn">{lastScan.missing} missing</Badge>}
        </div>
      )}

      <div style={{ marginTop: "1rem" }}>
        {tab === "local" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {folders.length === 0 ? (
              <EmptyState
                icon={<FileMusic size={20} />}
                title="No Music Folders Added"
                description={
                  inTauri
                    ? "Click 'Add Music Folder' to scan MP3, FLAC, WAV, AAC/M4A, OGG, Opus, and ALAC files."
                    : "Launch the desktop Tauri app to add local music folders and scan audio files."
                }
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                {folders.map((folder) => (
                  <div key={folder.id} className="aq-list-row">
                    <span className="aq-kv-val">{folder.path}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Remove folder ${folder.path}`}
                      onClick={() => void removeFolder(folder.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "artists" &&
          (artists.length === 0 ? (
            <EmptyState
              icon={<Mic2 size={20} />}
              title="No Artists Indexed"
              description="Scan a local music folder to browse artists."
            />
          ) : (
            <div className="aq-provider-grid">
              {artists.map((artist) => (
                <div key={artist.name} className="aq-provider-card">
                  <strong>{artist.name}</strong>
                  <div className="aq-row-wrap">
                    <Badge>{artist.track_count} tracks</Badge>
                    <Badge>{artist.album_count} albums</Badge>
                  </div>
                </div>
              ))}
            </div>
          ))}

        {tab === "albums" &&
          (albums.length === 0 ? (
            <EmptyState
              icon={<Disc3 size={20} />}
              title="No Albums Indexed"
              description="Scan a local music folder to browse albums and artwork."
            />
          ) : (
            <div className="aq-album-grid">
              {albums.map((album) => {
                const artUrl = resolveArtworkUrl(album.artwork_path);
                return (
                  <div key={`${album.name}-${album.artist}`} className="aq-album-card">
                    <div className="aq-album-art">
                      {artUrl ? <img src={artUrl} alt="" /> : <Disc3 size={32} />}
                    </div>
                    <strong className="aq-truncate" style={{ fontSize: "0.88rem" }}>
                      {album.name}
                    </strong>
                    <span
                      className="aq-truncate"
                      style={{ fontSize: "0.78rem", color: "var(--aq-muted)" }}
                    >
                      {album.artist}
                    </span>
                    <Badge>{album.track_count} tracks</Badge>
                  </div>
                );
              })}
            </div>
          ))}

        {(tab === "library" || tab === "favorites" || tab === "recent") &&
          renderTrackList(
            displayedTracks,
            tab === "favorites"
              ? "No Favorite Tracks Yet"
              : tab === "recent"
                ? "No Recently Played Tracks"
                : "Your Library Is Empty",
            tab === "recent"
              ? "Play any track to record it in your local playback history."
              : "Add a local music folder to index and play your music.",
          )}
      </div>
    </Panel>
  );
}
