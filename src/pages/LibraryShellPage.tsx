import {
  Check,
  Copy,
  Disc3,
  FileMusic,
  FolderPlus,
  Heart,
  Layers,
  Library,
  Link2,
  ListPlus,
  Mic2,
  Play,
  Plus,
  RefreshCw,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { backendApi, formatDurationMs, isTauriRuntime, resolveArtworkUrl } from "../api/backend";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Panel } from "../components/Panel";
import { type LibrarySort, useLibraryStore } from "../stores/useLibraryStore";
import { usePlayerStore } from "../stores/usePlayerStore";
import type { TrackRecord } from "../types/music";

export type LibraryTabId =
  | "library"
  | "local"
  | "artists"
  | "albums"
  | "genres"
  | "collections"
  | "duplicates"
  | "matches"
  | "favorites"
  | "recent";

const LIBRARY_TABS: readonly { id: LibraryTabId; label: string }[] = [
  { id: "library", label: "All Music" },
  { id: "local", label: "Local Folders" },
  { id: "artists", label: "Artists" },
  { id: "albums", label: "Albums" },
  { id: "genres", label: "Genres" },
  { id: "collections", label: "Collections" },
  { id: "duplicates", label: "Duplicates" },
  { id: "matches", label: "Track Matches" },
  { id: "favorites", label: "Favorites" },
  { id: "recent", label: "Recently Played" },
];

const DESKTOP_REQUIRED_TIP = "Requires desktop Tauri runtime";

interface LibraryShellPageProps {
  initialTab: LibraryTabId;
}

export function LibraryShellPage({ initialTab }: LibraryShellPageProps) {
  const [tab, setTab] = useState<LibraryTabId>(initialTab);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);
  const [collectionTracks, setCollectionTracks] = useState<TrackRecord[]>([]);
  const inTauri = isTauriRuntime();

  const {
    folders,
    tracks,
    artists,
    albums,
    genres,
    recentTracks,
    playlists,
    collections,
    duplicateGroups,
    identityLinks,
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
    createCollection,
    deleteCollection,
    addTrackToCollection,
    removeTrackFromCollection,
    setIdentityLinkStatus,
  } = useLibraryStore();

  const { currentTrack, playTrackList, addToQueue } = usePlayerStore();

  const activeCollection =
    collections.find((c) => c.id === selectedCollectionId) ?? collections[0] ?? null;

  useEffect(() => {
    if (!activeCollection || !inTauri) {
      setCollectionTracks([]);
      return;
    }
    let cancelled = false;
    void backendApi.getCollectionTracks(activeCollection.id).then((items) => {
      if (!cancelled) {
        setCollectionTracks(items);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activeCollection, collections, inTauri]);

  const displayedTracks: TrackRecord[] =
    tab === "favorites"
      ? tracks.filter((t) => t.is_favorite)
      : tab === "recent"
        ? recentTracks
        : selectedGenre
          ? tracks.filter((t) => t.genre === selectedGenre)
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
                {collections.length > 0 && (
                  <select
                    aria-label={`Add ${track.title} to collection`}
                    className="aq-select"
                    defaultValue=""
                    onChange={(e) => {
                      const cid = Number(e.target.value);
                      if (cid > 0) {
                        void addTrackToCollection(cid, track.id);
                      }
                      e.target.value = "";
                    }}
                  >
                    <option value="">+ Collection</option>
                    {collections.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
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
      title="Unified Library"
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
            onClick={() => {
              setTab(item.id);
              if (item.id !== "library") {
                setSelectedGenre(null);
              }
            }}
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
        {tab === "local" &&
          (folders.length === 0 ? (
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
          ))}

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

        {tab === "genres" &&
          (genres.length === 0 ? (
            <EmptyState
              icon={<Tag size={20} />}
              title="No Genres Indexed"
              description="Scan local tracks to browse by genre."
            />
          ) : (
            <div className="aq-provider-grid">
              {genres.map((genre) => (
                <button
                  key={genre.name}
                  type="button"
                  className="aq-provider-card"
                  style={{ textAlign: "left", cursor: "pointer" }}
                  onClick={() => {
                    setSelectedGenre(genre.name);
                    setTab("library");
                  }}
                >
                  <strong>{genre.name}</strong>
                  <Badge>{genre.track_count} tracks</Badge>
                </button>
              ))}
            </div>
          ))}

        {tab === "collections" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newCollectionName.trim()) {
                  return;
                }
                void createCollection(newCollectionName).then((col) => {
                  setNewCollectionName("");
                  if (col) {
                    setSelectedCollectionId(col.id);
                  }
                });
              }}
              className="aq-row-wrap"
            >
              <input
                type="text"
                className="aq-input"
                style={{ flex: 1, minWidth: "180px" }}
                placeholder="New custom collection name..."
                aria-label="New collection name"
                disabled={!inTauri}
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
              />
              <Button
                type="submit"
                size="sm"
                variant="primary"
                disabled={!inTauri || !newCollectionName.trim()}
                title={!inTauri ? DESKTOP_REQUIRED_TIP : "Create collection"}
              >
                <Plus size={14} />
                Create Collection
              </Button>
            </form>

            {collections.length === 0 ? (
              <EmptyState
                icon={<Layers size={20} />}
                title="No Custom Collections"
                description="Create a collection to group albums, moods, or lossless archives."
              />
            ) : (
              <div className="aq-grid-2">
                <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                  {collections.map((col) => (
                    <div
                      key={col.id}
                      className="aq-list-row"
                      style={
                        activeCollection?.id === col.id
                          ? { borderColor: "var(--aq-accent)" }
                          : undefined
                      }
                    >
                      <button
                        type="button"
                        className="aq-btn aq-btn--ghost aq-truncate"
                        style={{ flex: 1, justifyContent: "flex-start" }}
                        onClick={() => setSelectedCollectionId(col.id)}
                      >
                        <strong className="aq-truncate">{col.name}</strong>
                        <Badge>{col.track_count}</Badge>
                      </button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Delete collection ${col.name}`}
                        onClick={() => void deleteCollection(col.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                  {collectionTracks.map((t, idx) => (
                    <div key={t.id} className="aq-list-row">
                      <button
                        type="button"
                        className="aq-btn aq-btn--ghost aq-truncate"
                        style={{ flex: 1, justifyContent: "flex-start" }}
                        onClick={() => void playTrackList(collectionTracks, idx)}
                      >
                        <Play size={13} />
                        <span className="aq-truncate">{t.title}</span>
                      </button>
                      {activeCollection && (
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Remove ${t.title} from collection`}
                          onClick={() => void removeTrackFromCollection(activeCollection.id, t.id)}
                        >
                          <X size={13} />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "duplicates" &&
          (duplicateGroups.length === 0 ? (
            <EmptyState
              icon={<Copy size={20} />}
              title="No Duplicate Recordings Detected"
              description="Tracks are compared by normalized title/artist, version qualifier (live/remix/cover/explicit), and duration tolerance. Distinct versions are never merged."
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {duplicateGroups.map((group) => (
                <div key={group.canonical_key} className="aq-provider-card">
                  <div className="aq-row-wrap" style={{ justifyContent: "space-between" }}>
                    <strong>
                      {group.display_title} — {group.display_artist}
                    </strong>
                    <Badge tone="warn">{group.tracks.length} copies</Badge>
                  </div>
                  {group.tracks.map((t) => (
                    <div key={t.id} className="aq-list-row">
                      <Badge>{t.format.toUpperCase()}</Badge>
                      <span className="aq-truncate" style={{ flex: 1, fontSize: "0.78rem" }}>
                        {t.file_path}
                      </span>
                      <span className="aq-timecode">{formatDurationMs(t.duration_ms)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}

        {tab === "matches" &&
          (identityLinks.length === 0 ? (
            <EmptyState
              icon={<Link2 size={20} />}
              title="No Pending Track Identity Matches"
              description="Probable cross-source or multi-format matches appear here for explicit user confirmation."
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {identityLinks.map((link) => (
                <div key={`${link.track_a_id}-${link.track_b_id}`} className="aq-provider-card">
                  <div className="aq-row-wrap" style={{ justifyContent: "space-between" }}>
                    <strong>
                      {link.track_a_title} ↔ {link.track_b_title}
                    </strong>
                    <Badge tone={link.status === "confirmed" ? "ok" : "accent"}>
                      {Math.round(link.confidence * 100)}% • {link.status}
                    </Badge>
                  </div>
                  <span style={{ fontSize: "0.78rem", color: "var(--aq-muted)" }}>
                    {link.match_reason}
                  </span>
                  <div className="aq-row-wrap">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        void setIdentityLinkStatus(link.track_a_id, link.track_b_id, "confirmed")
                      }
                    >
                      <Check size={14} />
                      Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        void setIdentityLinkStatus(link.track_a_id, link.track_b_id, "dismissed")
                      }
                    >
                      <X size={14} />
                      Dismiss
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ))}

        {(tab === "library" || tab === "favorites" || tab === "recent") && (
          <>
            {selectedGenre && (
              <div className="aq-row-wrap" style={{ marginBottom: "0.75rem" }}>
                <Badge tone="accent">Genre: {selectedGenre}</Badge>
                <Button size="sm" variant="ghost" onClick={() => setSelectedGenre(null)}>
                  Clear Filter
                </Button>
              </div>
            )}
            {renderTrackList(
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
          </>
        )}
      </div>
    </Panel>
  );
}
