import { useEffect } from "react";
import type { NavSectionId } from "../layouts/nav";
import { matchesShortcut, useShortcutsStore } from "../stores/useShortcutsStore";

interface UseKeyboardShortcutsOptions {
  helpOpen: boolean;
  onNavigate: (section: NavSectionId) => void;
  onToggleSidebar: () => void;
  onToggleQueue: () => void;
  onToggleHelp: () => void;
  onCloseHelp: () => void;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

export function useKeyboardShortcuts({
  helpOpen,
  onNavigate,
  onToggleSidebar,
  onToggleQueue,
  onToggleHelp,
  onCloseHelp,
}: UseKeyboardShortcutsOptions): void {
  const bindings = useShortcutsStore((state) => state.bindings);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && helpOpen) {
        event.preventDefault();
        onCloseHelp();
        return;
      }

      const hasModifier = event.ctrlKey || event.metaKey || event.altKey;
      if (!hasModifier && isEditableTarget(event.target)) {
        return;
      }

      if (matchesShortcut(event, bindings["nav.home"])) {
        event.preventDefault();
        onNavigate("home");
      } else if (matchesShortcut(event, bindings["nav.search"])) {
        event.preventDefault();
        onNavigate("search");
      } else if (matchesShortcut(event, bindings["nav.library"])) {
        event.preventDefault();
        onNavigate("library");
      } else if (matchesShortcut(event, bindings["nav.playlists"])) {
        event.preventDefault();
        onNavigate("playlists");
      } else if (matchesShortcut(event, bindings["nav.downloads"])) {
        event.preventDefault();
        onNavigate("downloads");
      } else if (matchesShortcut(event, bindings["nav.settings"])) {
        event.preventDefault();
        onNavigate("settings");
      } else if (matchesShortcut(event, bindings["ui.toggleSidebar"])) {
        event.preventDefault();
        onToggleSidebar();
      } else if (matchesShortcut(event, bindings["ui.toggleQueue"])) {
        event.preventDefault();
        onToggleQueue();
      } else if (matchesShortcut(event, bindings["ui.shortcutsHelp"])) {
        event.preventDefault();
        onToggleHelp();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [bindings, helpOpen, onCloseHelp, onNavigate, onToggleHelp, onToggleQueue, onToggleSidebar]);
}
