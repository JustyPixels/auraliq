import { Play, Search, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { backendApi, formatDurationMs, isTauriRuntime } from "../api/backend";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Panel } from "../components/Panel";
import { usePlayerStore } from "../stores/usePlayerStore";
import type { TrackRecord } from "../types/music";

type SourceFilter = "all" | "local" | "internet_archive" | "radio_browser";

const SOURCE_FILTERS: readonly { id: SourceFilter; label: string }[] = [
  { id: "all", label: "All Sources" },
  { id: "local", label: "Local" },
  { id: "internet_archive", label: "Internet Archive" },
  { id: "radio_browser", label: "Radio Browser" },
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
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [history, setHistory] = useState<string[]>(loadHistory);
  const [results, setResults] = useState<TrackRecord[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const playTrackList = usePlayerStore((state) => state.playTrackList);
  const inTauri = isTauriRuntime();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!inTauri || (sourceFilter !== "all" && sourceFilter !== "local")) {
      setResults([]);
      return;
    }
    let cancelled = false;
    void backendApi.searchTracks(query).then((hits) => {
      if (!cancelled) {
        setResults(hits);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [inTauri, query, sourceFilter]);

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
              placeholder="Search local tracks, albums, artists, or genres..."
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

      <Panel title="Results" badge={<Badge>{results.length}</Badge>}>
        {results.length > 0 ? (
          <div className="aq-track-list">
            {results.map((track, idx) => (
              <div key={track.id} className="aq-track-row">
                <Button
                  size="icon"
                  variant="primary"
                  aria-label={`Play ${track.title}`}
                  onClick={() => void playTrackList(results, idx)}
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
                <Badge tone="accent">LOCAL</Badge>
                <span className="aq-timecode">{formatDurationMs(track.duration_ms)}</span>
                <span />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Search size={20} />}
            title={
              sourceFilter === "internet_archive" || sourceFilter === "radio_browser"
                ? "Online Provider Search Scheduled"
                : query.trim()
                  ? `No local results for "${query.trim()}"`
                  : "Search Local FTS5 Index"
            }
            description={
              sourceFilter === "internet_archive" || sourceFilter === "radio_browser"
                ? "Online provider search (Internet Archive, Radio Browser) unlocks in Milestone 8."
                : "Type to search your local SQLite FTS5 library by title, artist, album, or genre."
            }
            milestoneTag={
              sourceFilter === "internet_archive" || sourceFilter === "radio_browser"
                ? "Milestone 8"
                : undefined
            }
          />
        )}
      </Panel>
    </>
  );
}
