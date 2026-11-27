import { Download, ExternalLink, ListPlus, Music, Play, Search, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { backendApi, formatDurationMs, isTauriRuntime } from "../api/backend";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Panel } from "../components/Panel";
import { useDownloadsStore } from "../stores/useDownloadsStore";
import { useLibraryStore } from "../stores/useLibraryStore";
import { usePlayerStore } from "../stores/usePlayerStore";
import type { TrackRecord } from "../types/music";
import type { OnlineTrack } from "../types/providers";

type SourceFilter =
  "local" | "audius" | "internet_archive" | "radio_browser" | "jamendo" | "freesound" | "youtube";
type DurationFilter = "any" | "short" | "medium" | "long";

const SOURCE_FILTERS: readonly { id: SourceFilter; label: string }[] = [
  { id: "local", label: "Local Library" },
  { id: "audius", label: "Audius" },
  { id: "internet_archive", label: "Internet Archive" },
  { id: "radio_browser", label: "Radio Browser" },
  { id: "jamendo", label: "Jamendo (Key)" },
  { id: "freesound", label: "Freesound (Key)" },
  { id: "youtube", label: "YouTube (Key)" },
];

const HISTORY_KEY = "auraliq.searchHistory.v1";

function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("local");
  const [genreFilter, setGenreFilter] = useState("");
  const [durationFilter, setDurationFilter] = useState<DurationFilter>("any");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [history, setHistory] = useState<string[]>(loadHistory);
  const [localResults, setLocalResults] = useState<TrackRecord[]>([]);
  const [onlineResults, setOnlineResults] = useState<OnlineTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const genres = useLibraryStore((state) => state.genres);
  const { playTrackList, playOnlineTrackList, addToQueue, addOnlineToQueue } = usePlayerStore();
  const enqueueDownload = useDownloadsStore((state) => state.enqueueDownload);
  const inTauri = isTauriRuntime();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!inTauri) {
      setLocalResults([]);
      setOnlineResults([]);
      return;
    }

    let cancelled = false;
    setSearchError(null);

    if (sourceFilter === "local") {
      const min_duration_sec =
        durationFilter === "medium" ? 180 : durationFilter === "long" ? 360 : undefined;
      const max_duration_sec =
        durationFilter === "short" ? 180 : durationFilter === "medium" ? 360 : undefined;

      void backendApi
        .searchTracksFiltered({
          query,
          source: "local",
          genre: genreFilter || undefined,
          min_duration_sec,
          max_duration_sec,
          favorites_only: favoritesOnly,
        })
        .then((hits) => {
          if (!cancelled) {
            setLocalResults(hits);
            setOnlineResults([]);
          }
        })
        .catch((err: unknown) => {
          if (!cancelled) {
            setSearchError(err instanceof Error ? err.message : String(err));
          }
        });
    } else {
      setSearching(true);
      void backendApi
        .searchProvider(sourceFilter, query, 20)
        .then((res) => {
          if (!cancelled) {
            setOnlineResults(res.tracks);
            setLocalResults([]);
            setSearching(false);
          }
        })
        .catch((err: unknown) => {
          if (!cancelled) {
            setOnlineResults([]);
            setSearching(false);
            setSearchError(err instanceof Error ? err.message : String(err));
          }
        });
    }

    return () => {
      cancelled = true;
    };
  }, [durationFilter, favoritesOnly, genreFilter, inTauri, query, sourceFilter]);

  const saveSearch = (term: string) => {
    const clean = term.trim();
    if (!clean) {
      return;
    }
    const next = [clean, ...history.filter((item) => item !== clean)].slice(0, 8);
    setHistory(next);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage errors
    }
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      // Ignore storage errors
    }
  };

  const resultCount = sourceFilter === "local" ? localResults.length : onlineResults.length;

  return (
    <>
      <Panel title="Unified Search" ledActive>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveSearch(query);
          }}
          style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}
        >
          <div className="aq-row-wrap">
            <input
              ref={inputRef}
              id="auraliq-search-input"
              type="search"
              className="aq-input"
              style={{ flex: 1, minWidth: "220px" }}
              placeholder="Search local tracks or online catalogs..."
              aria-label="Search music"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button type="submit" variant="primary" size="md">
              <Search size={15} />
              Search
            </Button>
          </div>

          <div className="aq-row-wrap" role="group" aria-label="Source filters">
            {SOURCE_FILTERS.map((filter) => (
              <Button
                key={filter.id}
                size="sm"
                variant="secondary"
                active={sourceFilter === filter.id}
                aria-pressed={sourceFilter === filter.id}
                onClick={() => setSourceFilter(filter.id)}
              >
                {filter.label}
              </Button>
            ))}

            {sourceFilter === "local" && (
              <>
                <select
                  aria-label="Filter by genre"
                  className="aq-select"
                  value={genreFilter}
                  onChange={(e) => setGenreFilter(e.target.value)}
                >
                  <option value="">All Genres</option>
                  {genres.map((g) => (
                    <option key={g.name} value={g.name}>
                      {g.name} ({g.track_count})
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Filter by duration"
                  className="aq-select"
                  value={durationFilter}
                  onChange={(e) => setDurationFilter(e.target.value as DurationFilter)}
                >
                  <option value="any">Any Duration</option>
                  <option value="short">Under 3 min</option>
                  <option value="medium">3 – 6 min</option>
                  <option value="long">Over 6 min</option>
                </select>

                <Button
                  size="sm"
                  variant="secondary"
                  active={favoritesOnly}
                  aria-pressed={favoritesOnly}
                  onClick={() => setFavoritesOnly((prev) => !prev)}
                >
                  Favorites Only
                </Button>
              </>
            )}
          </div>
        </form>
      </Panel>

      {history.length > 0 && (
        <Panel
          title="Recent Searches"
          headerActions={
            <Button size="sm" variant="ghost" onClick={clearHistory}>
              <Trash2 size={14} />
              Clear
            </Button>
          }
        >
          <div className="aq-row-wrap">
            {history.map((term) => (
              <Button key={term} size="sm" variant="secondary" onClick={() => setQuery(term)}>
                {term}
              </Button>
            ))}
          </div>
        </Panel>
      )}

      <Panel
        title="Results"
        badge={<Badge>{searching ? "Searching..." : `${resultCount} results`}</Badge>}
      >
        {downloadNotice && (
          <p role="status" style={{ color: "var(--aq-accent)", marginTop: 0 }}>
            {downloadNotice}
          </p>
        )}
        {searchError && (
          <p role="alert" style={{ color: "var(--aq-warn)", marginTop: 0 }}>
            {searchError}
          </p>
        )}

        {sourceFilter === "local" && localResults.length > 0 && (
          <div className="aq-track-list">
            {localResults.map((track, idx) => (
              <div key={track.id} className="aq-track-row">
                <Button
                  size="icon"
                  variant="primary"
                  aria-label={`Play ${track.title}`}
                  onClick={() => void playTrackList(localResults, idx)}
                >
                  <Play size={14} />
                </Button>
                <div className="aq-truncate">
                  <strong>{track.title}</strong>
                  <div style={{ fontSize: "0.76rem", color: "var(--aq-muted)" }}>
                    {track.artist}
                  </div>
                </div>
                <div className="aq-truncate" style={{ color: "var(--aq-muted)" }}>
                  {track.album}
                </div>
                <Badge tone="accent">{track.source_provider.toUpperCase()}</Badge>
                <span className="aq-timecode">{formatDurationMs(track.duration_ms)}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Add ${track.title} to queue`}
                  onClick={() => addToQueue(track)}
                >
                  <ListPlus size={14} />
                </Button>
              </div>
            ))}
          </div>
        )}

        {sourceFilter !== "local" && onlineResults.length > 0 && (
          <div className="aq-track-list">
            {onlineResults.map((track, idx) => (
              <div key={`${track.provider_id}-${track.external_id}`} className="aq-track-row">
                <div className="aq-thumb">
                  {track.artwork_url ? <img src={track.artwork_url} alt="" /> : <Music size={16} />}
                </div>
                <div className="aq-truncate">
                  <strong>{track.title}</strong>
                  <div style={{ fontSize: "0.76rem", color: "var(--aq-muted)" }}>
                    {track.artist}
                  </div>
                </div>
                <div className="aq-truncate" style={{ color: "var(--aq-muted)" }}>
                  {track.album}
                </div>
                <Badge tone="accent">{track.provider_id.toUpperCase()}</Badge>
                <span className="aq-timecode">
                  {track.duration_ms > 0 ? formatDurationMs(track.duration_ms) : "LIVE"}
                </span>
                <div className="aq-row-wrap">
                  {track.provider_id === "youtube" ? (
                    track.external_url && (
                      <a
                        href={track.external_url}
                        target="_blank"
                        rel="noreferrer"
                        className="aq-btn aq-btn--secondary aq-btn--sm"
                      >
                        <ExternalLink size={13} />
                        Watch
                      </a>
                    )
                  ) : (
                    <>
                      <Button
                        size="icon"
                        variant="primary"
                        aria-label={`Play ${track.title}`}
                        onClick={() => void playOnlineTrackList(onlineResults, idx)}
                      >
                        <Play size={14} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Add ${track.title} to queue`}
                        onClick={() => addOnlineToQueue(track)}
                      >
                        <ListPlus size={14} />
                      </Button>
                      {track.downloadable && (
                        <Button
                          size="icon"
                          variant="secondary"
                          aria-label={`Download ${track.title}`}
                          title="Download permitted track"
                          onClick={() => {
                            void enqueueDownload(track).then((rec) => {
                              if (rec) {
                                setDownloadNotice(`Queued "${track.title}" for download.`);
                              }
                            });
                          }}
                        >
                          <Download size={14} />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {resultCount === 0 && !searching && (
          <EmptyState
            icon={<Search size={20} />}
            title={
              sourceFilter === "local"
                ? query.trim()
                  ? `No local results for "${query.trim()}"`
                  : "Search Local FTS5 Index"
                : inTauri
                  ? `No results from ${sourceFilter}`
                  : "Desktop Runtime Required for Online Search"
            }
            description={
              sourceFilter === "local"
                ? "Type to search your local SQLite FTS5 library by title, artist, album, or genre."
                : "Select Audius, Internet Archive, or Radio Browser for free zero-config streaming, or add your own API keys for Jamendo, Freesound, and YouTube in Settings -> Providers."
            }
          />
        )}
      </Panel>
    </>
  );
}
