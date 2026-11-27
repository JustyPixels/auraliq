import { useState } from "react";
import { Badge } from "../components/Badge";
import { useAppInfo } from "../hooks/useAppInfo";
import { HomePage } from "../pages/HomePage";
import { SectionPlaceholderPage } from "../pages/SectionPlaceholderPage";
import { SettingsPage } from "../pages/SettingsPage";
import { useThemeStore } from "../stores/useThemeStore";
import { getThemeById } from "../themes/applyTheme";
import { NAV_ITEMS, type NavSectionId } from "./nav";
import { PlayerBar } from "./PlayerBar";
import { RightPanel, type RightPanelTab } from "./RightPanel";
import { Sidebar } from "./Sidebar";

export function AppShell() {
  const [activeSection, setActiveSection] = useState<NavSectionId>("home");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>("queue");

  const { info, status, error } = useAppInfo();
  const themeId = useThemeStore((state) => state.themeId);
  const currentTheme = getThemeById(themeId);
  const currentNav = NAV_ITEMS.find((item) => item.id === activeSection) ?? NAV_ITEMS[0];

  const handleToggleRightPanelTab = (tab: RightPanelTab) => {
    if (rightPanelOpen && rightPanelTab === tab) {
      setRightPanelOpen(false);
      return;
    }
    setRightPanelTab(tab);
    setRightPanelOpen(true);
  };

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
          onSelectSection={setActiveSection}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        />

        <div className="aq-main">
          <header className="aq-topbar">
            <h1 className="aq-topbar__title">{currentNav.label}</h1>
            <div className="aq-topbar__actions">
              <Badge tone="neutral">{currentTheme.name}</Badge>
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
            {activeSection === "settings" && <SettingsPage appInfo={info} runtimeStatus={status} />}
            {activeSection !== "home" && activeSection !== "settings" && (
              <SectionPlaceholderPage item={currentNav} />
            )}
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
        onToggleRightPanelTab={handleToggleRightPanelTab}
      />
    </div>
  );
}
