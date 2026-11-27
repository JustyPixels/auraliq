import { HelpCircle } from "lucide-react";
import { useState } from "react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { PlaybackToast } from "../components/PlaybackToast";
import { ShortcutsModal } from "../components/ShortcutsModal";
import { useAppInfo } from "../hooks/useAppInfo";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { DiscoverPage } from "../pages/DiscoverPage";
import { DownloadsPage } from "../pages/DownloadsPage";
import { HomePage } from "../pages/HomePage";
import { LibraryShellPage, type LibraryTabId } from "../pages/LibraryShellPage";
import { PlaylistsPage } from "../pages/PlaylistsPage";
import { SearchPage } from "../pages/SearchPage";
import { SettingsPage } from "../pages/SettingsPage";
import { useDownloadsStore } from "../stores/useDownloadsStore";
import { useLayoutStore } from "../stores/useLayoutStore";
import { useThemeStore } from "../stores/useThemeStore";
import { getThemeById } from "../themes/applyTheme";
import { NAV_ITEMS } from "./nav";
import { PlayerBar } from "./PlayerBar";
import { RightPanel } from "./RightPanel";
import { Sidebar } from "./Sidebar";

const LIBRARY_SECTIONS = new Set<string>([
  "library",
  "local",
  "artists",
  "albums",
  "favorites",
  "recent",
]);

export function AppShell() {
  const [helpOpen, setHelpOpen] = useState(false);

  const {
    activeSection,
    sidebarCollapsed,
    sidebarWidth,
    navOrder,
    hiddenSections,
    pinnedSections,
    rightPanelOpen,
    rightPanelTab,
    setActiveSection,
    toggleSidebarCollapsed,
    setSidebarWidth,
    toggleRightPanelTab,
    setRightPanelOpen,
    setRightPanelTab,
  } = useLayoutStore();

  const { info, status, error } = useAppInfo();
  const offlineMode = useDownloadsStore((state) => state.cacheStats?.offline_mode ?? false);
  const themeId = useThemeStore((state) => state.themeId);
  const currentTheme = getThemeById(themeId);
  const currentNav = NAV_ITEMS.find((item) => item.id === activeSection) ?? NAV_ITEMS[0];

  useKeyboardShortcuts({
    helpOpen,
    onNavigate: setActiveSection,
    onToggleSidebar: toggleSidebarCollapsed,
    onToggleQueue: () => toggleRightPanelTab("queue"),
    onToggleHelp: () => setHelpOpen((prev) => !prev),
    onCloseHelp: () => setHelpOpen(false),
  });

  const ipcBadge =
    status === "tauri" ? (
      <Badge tone="ok" dot>
        Tauri IPC Connected
      </Badge>
    ) : status === "browser-preview" ? (
      <Badge tone="accent">Browser Preview</Badge>
    ) : status === "error" ? (
      <Badge tone="warn">IPC Error</Badge>
    ) : (
      <Badge>Connecting...</Badge>
    );

  return (
    <div className="aq-shell">
      <div className="aq-scanlines" aria-hidden="true" />
      <div className="aq-workspace">
        <Sidebar
          activeSection={activeSection}
          collapsed={sidebarCollapsed}
          sidebarWidth={sidebarWidth}
          navOrder={navOrder}
          hiddenSections={hiddenSections}
          pinnedSections={pinnedSections}
          onSelectSection={setActiveSection}
          onToggleCollapse={toggleSidebarCollapsed}
          onResizeSidebar={setSidebarWidth}
        />

        <div className="aq-main">
          <header className="aq-topbar">
            <h1 className="aq-topbar__title">{currentNav.label}</h1>
            <div className="aq-topbar__actions">
              <Button
                size="icon"
                variant="ghost"
                aria-label="Keyboard shortcuts"
                title="Keyboard shortcuts (?)"
                onClick={() => setHelpOpen(true)}
              >
                <HelpCircle size={16} />
              </Button>
              <Badge tone="neutral">{currentTheme.name}</Badge>
              {offlineMode && <Badge tone="warn">Offline Mode</Badge>}
              {ipcBadge}
            </div>
          </header>

          <main className="aq-content">
            {activeSection === "home" && (
              <HomePage
                appInfo={info}
                runtimeStatus={status}
                ipcError={error}
                onOpenSettings={() => setActiveSection("settings")}
              />
            )}
            {activeSection === "search" && <SearchPage />}
            {LIBRARY_SECTIONS.has(activeSection) && (
              <LibraryShellPage key={activeSection} initialTab={activeSection as LibraryTabId} />
            )}
            {activeSection === "playlists" && <PlaylistsPage />}
            {activeSection === "downloads" && <DownloadsPage />}
            {activeSection === "settings" && <SettingsPage appInfo={info} runtimeStatus={status} />}
            {activeSection === "discover" && <DiscoverPage />}
          </main>
        </div>

        {rightPanelOpen && (
          <RightPanel
            activeTab={rightPanelTab}
            onSelectTab={setRightPanelTab}
            onClose={() => setRightPanelOpen(false)}
          />
        )}
      </div>

      <PlayerBar
        rightPanelOpen={rightPanelOpen}
        rightPanelTab={rightPanelTab}
        onToggleRightPanelTab={toggleRightPanelTab}
      />

      <PlaybackToast />
      <ShortcutsModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
