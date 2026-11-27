import { Search, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Panel } from "../components/Panel";

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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
              placeholder="Search tracks, albums, artists, or stations..."
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

      <Panel title="Results">
        <EmptyState
          icon={<Search size={20} />}
          title={query.trim() ? `No indexed results for "${query.trim()}"` : "Search Ready"}
          description="Local SQLite FTS5 indexing unlocks in Milestone 4, and online provider search (Internet Archive, Radio Browser) unlocks in Milestone 8. Results will always display explicit source badges."
          milestoneTag="Milestone 4 / 8"
        />
      </Panel>
    </>
  );
}
