import type { LucideIcon } from "lucide-react";
import {
  Compass,
  Disc3,
  Download,
  FileMusic,
  Heart,
  History,
  Home,
  Library,
  ListMusic,
  Mic2,
  Search,
  Settings,
} from "lucide-react";

export type NavSectionId =
  | "home"
  | "search"
  | "discover"
  | "library"
  | "artists"
  | "albums"
  | "playlists"
  | "local"
  | "downloads"
  | "favorites"
  | "recent"
  | "settings";

export interface NavItem {
  id: NavSectionId;
  label: string;
  group: "Primary" | "Library" | "System";
  icon: LucideIcon;
  plannedMilestone?: string;
  description?: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { id: "home", label: "Home", group: "Primary", icon: Home },
  {
    id: "search",
    label: "Search",
    group: "Primary",
    icon: Search,
    plannedMilestone: "Milestone 3 / 6",
    description: "Unified search across local tracks and compliant online providers.",
  },
  {
    id: "discover",
    label: "Discover",
    group: "Primary",
    icon: Compass,
    plannedMilestone: "Milestone 6 / 8",
    description: "Source-aware discovery from your local library and open music directories.",
  },
  {
    id: "library",
    label: "Your Library",
    group: "Library",
    icon: Library,
    plannedMilestone: "Milestone 4",
    description: "SQLite + FTS5 indexed library with unified track browsing.",
  },
  {
    id: "artists",
    label: "Artists",
    group: "Library",
    icon: Mic2,
    plannedMilestone: "Milestone 4",
    description: "Browse artists across your scanned folders and online sources.",
  },
  {
    id: "albums",
    label: "Albums",
    group: "Library",
    icon: Disc3,
    plannedMilestone: "Milestone 4",
    description: "Album grid with embedded and external cover art caching.",
  },
  {
    id: "playlists",
    label: "Playlists",
    group: "Library",
    icon: ListMusic,
    plannedMilestone: "Milestone 4",
    description: "Local playlists, smart rules, and M3U/M3U8/PLS import & export.",
  },
  {
    id: "local",
    label: "Local Music",
    group: "Library",
    icon: FileMusic,
    plannedMilestone: "Milestone 4",
    description: "Add folders and scan MP3, FLAC, WAV, AAC/M4A, OGG, Opus, and ALAC files.",
  },
  {
    id: "downloads",
    label: "Downloads",
    group: "Library",
    icon: Download,
    plannedMilestone: "Milestone 9",
    description: "Source-aware download queue exclusively for permitted open providers.",
  },
  {
    id: "favorites",
    label: "Favorites",
    group: "Library",
    icon: Heart,
    plannedMilestone: "Milestone 4",
    description: "Your starred tracks and collections.",
  },
  {
    id: "recent",
    label: "Recently Played",
    group: "Library",
    icon: History,
    plannedMilestone: "Milestone 4",
    description: "Chronological playback history stored locally.",
  },
  { id: "settings", label: "Settings", group: "System", icon: Settings },
];

export const NAV_GROUPS: readonly NavItem["group"][] = ["Primary", "Library", "System"];
