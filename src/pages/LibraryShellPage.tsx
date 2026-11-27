import { Disc3, FileMusic, Heart, History, Library, Mic2 } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Panel } from "../components/Panel";

export type LibraryTabId = "library" | "local" | "artists" | "albums" | "favorites" | "recent";
type SortOption = "title" | "artist" | "recent";

const LIBRARY_TABS: readonly { id: LibraryTabId; label: string }[] = [
  { id: "library", label: "All Music" },
  { id: "local", label: "Local Folders" },
  { id: "artists", label: "Artists" },
  { id: "albums", label: "Albums" },
  { id: "favorites", label: "Favorites" },
  { id: "recent", label: "Recently Played" },
];

interface LibraryShellPageProps {
  initialTab: LibraryTabId;
}

export function LibraryShellPage({ initialTab }: LibraryShellPageProps) {
  const [tab, setTab] = useState<LibraryTabId>(initialTab);
  const [sortBy, setSortBy] = useState<SortOption>("title");

  const activeIcon =
    tab === "local" ? (
      <FileMusic size={20} />
    ) : tab === "artists" ? (
      <Mic2 size={20} />
    ) : tab === "albums" ? (
      <Disc3 size={20} />
    ) : tab === "favorites" ? (
      <Heart size={20} />
    ) : tab === "recent" ? (
      <History size={20} />
    ) : (
      <Library size={20} />
    );

  return (
    <Panel
      title="Library Browser"
      headerActions={
        <div className="aq-row-wrap">
          <select
            aria-label="Sort library"
            className="aq-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
          >
            <option value="title">Sort: Title</option>
            <option value="artist">Sort: Artist</option>
            <option value="recent">Sort: Date Added</option>
          </select>
          <Button
            size="sm"
            variant="primary"
            disabled
            title="Folder scanning activates in Milestone 4"
          >
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

      <div style={{ marginTop: "1rem" }}>
        <EmptyState
          icon={activeIcon}
          title={`${LIBRARY_TABS.find((t) => t.id === tab)?.label ?? "Library"} — Ready for Local Engine`}
          description="Recursive folder scanning (walkdir), Lofty metadata & artwork extraction, and SQLite FTS5 storage will populate this view in Milestone 4."
          milestoneTag="Milestone 4"
        />
      </div>
    </Panel>
  );
}
