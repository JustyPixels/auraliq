import { ArrowDown, ArrowUp, Eye, EyeOff, Pin, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Panel } from "../components/Panel";
import { Slider } from "../components/Slider";
import { ThemePicker } from "../components/ThemePicker";
import type { RuntimeStatus } from "../hooks/useAppInfo";
import { NAV_ITEMS, type NavSectionId } from "../layouts/nav";
import { PROVIDER_CATALOG } from "../providers/catalog";
import {
  LOCKED_NAV_SECTIONS,
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  useLayoutStore,
} from "../stores/useLayoutStore";
import {
  formatKeyEvent,
  SHORTCUT_DEFINITIONS,
  type ShortcutActionId,
  useShortcutsStore,
} from "../stores/useShortcutsStore";
import type { AppInfo } from "../types/system";

type SettingsTab = "appearance" | "layout" | "providers" | "shortcuts" | "system";

interface SettingsPageProps {
  appInfo: AppInfo | null;
  runtimeStatus: RuntimeStatus;
}

const NAV_MAP = new Map(NAV_ITEMS.map((item) => [item.id, item]));

export function SettingsPage({ appInfo, runtimeStatus }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("appearance");
  const [capturingId, setCapturingId] = useState<ShortcutActionId | null>(null);

  const {
    defaultLandingPage,
    sidebarWidth,
    navOrder,
    hiddenSections,
    pinnedSections,
    uiDensity,
    setDefaultLandingPage,
    setSidebarWidth,
    togglePinSection,
    toggleHideSection,
    moveNavSection,
    setUiDensity,
    resetLayout,
  } = useLayoutStore();

  const { bindings, setBinding, resetShortcuts } = useShortcutsStore();

  useEffect(() => {
    if (!capturingId) {
      return;
    }

    const handleCapture = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.key === "Escape") {
        setCapturingId(null);
        return;
      }
      const formatted = formatKeyEvent(event);
      if (formatted) {
        setBinding(capturingId, formatted);
        setCapturingId(null);
      }
    };

    window.addEventListener("keydown", handleCapture, { capture: true });
    return () => window.removeEventListener("keydown", handleCapture, { capture: true });
  }, [capturingId, setBinding]);

  const visibleSections = NAV_ITEMS.filter((item) => !hiddenSections.includes(item.id));

  return (
    <>
      <div className="aq-tabs" role="tablist" aria-label="Settings categories">
        {(
          [
            ["appearance", "Appearance"],
            ["layout", "Layout & Sidebar"],
            ["providers", "Providers"],
            ["shortcuts", "Shortcuts"],
            ["system", "System"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            size="sm"
            variant="ghost"
            active={activeTab === id}
            role="tab"
            aria-selected={activeTab === id}
            onClick={() => setActiveTab(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      {activeTab === "appearance" && (
        <>
          <Panel title="Appearance & Themes" ledActive>
            <ThemePicker />
          </Panel>

          <Panel title="UI Density">
            <div className="aq-row-wrap">
              <Button
                size="sm"
                variant="secondary"
                active={uiDensity === "comfortable"}
                onClick={() => setUiDensity("comfortable")}
              >
                Comfortable
              </Button>
              <Button
                size="sm"
                variant="secondary"
                active={uiDensity === "compact"}
                onClick={() => setUiDensity("compact")}
              >
                Compact
              </Button>
            </div>
          </Panel>
        </>
      )}

      {activeTab === "layout" && (
        <Panel
          title="Layout & Sidebar Customization"
          ledActive
          headerActions={
            <Button size="sm" variant="secondary" onClick={resetLayout}>
              <RotateCcw size={14} />
              Reset Layout
            </Button>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
            <div className="aq-grid-2">
              <div className="aq-kv-item">
                <label htmlFor="aq-landing-select" className="aq-kv-label">
                  Default Landing Page
                </label>
                <select
                  id="aq-landing-select"
                  className="aq-select"
                  value={defaultLandingPage}
                  onChange={(e) => setDefaultLandingPage(e.target.value as NavSectionId)}
                >
                  {visibleSections.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="aq-kv-item">
                <span className="aq-kv-label">Sidebar Width ({sidebarWidth}px)</span>
                <Slider
                  label="Sidebar width"
                  min={MIN_SIDEBAR_WIDTH}
                  max={MAX_SIDEBAR_WIDTH}
                  value={sidebarWidth}
                  onChange={(e) => setSidebarWidth(Number(e.target.value))}
                />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
              {navOrder.map((id, index) => {
                const item = NAV_MAP.get(id);
                if (!item) {
                  return null;
                }
                const isLocked = LOCKED_NAV_SECTIONS.includes(id);
                const isHidden = hiddenSections.includes(id);
                const isPinned = pinnedSections.includes(id);

                return (
                  <div key={id} className="aq-list-row">
                    <div className="aq-row-wrap">
                      <strong>{item.label}</strong>
                      <Badge>{item.group}</Badge>
                      {isPinned && <Badge tone="accent">Pinned</Badge>}
                      {isHidden && <Badge tone="warn">Hidden</Badge>}
                    </div>

                    <div className="aq-row-wrap">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Move ${item.label} up`}
                        disabled={index === 0}
                        onClick={() => moveNavSection(id, "up")}
                      >
                        <ArrowUp size={14} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Move ${item.label} down`}
                        disabled={index === navOrder.length - 1}
                        onClick={() => moveNavSection(id, "down")}
                      >
                        <ArrowDown size={14} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        active={isPinned}
                        aria-label={isPinned ? `Unpin ${item.label}` : `Pin ${item.label}`}
                        onClick={() => togglePinSection(id)}
                      >
                        <Pin size={14} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={isLocked}
                        title={isLocked ? `${item.label} cannot be hidden` : undefined}
                        aria-label={isHidden ? `Show ${item.label}` : `Hide ${item.label}`}
                        onClick={() => toggleHideSection(id)}
                      >
                        {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Panel>
      )}

      {activeTab === "providers" && (
        <Panel title="Music Source Capabilities">
          <div className="aq-provider-grid">
            {PROVIDER_CATALOG.map((provider) => (
              <article key={provider.id} className="aq-provider-card">
                <div className="aq-row-wrap" style={{ justifyContent: "space-between" }}>
                  <strong>{provider.name}</strong>
                  <Badge tone="accent">{provider.statusLabel}</Badge>
                </div>
                <span style={{ fontSize: "0.78rem", color: "var(--aq-muted)" }}>
                  {provider.tier}
                </span>
                <p style={{ margin: 0, fontSize: "0.86rem", lineHeight: 1.45 }}>
                  {provider.description}
                </p>
                <div className="aq-row-wrap">
                  <Badge>Search: {provider.capabilities.search}</Badge>
                  <Badge>Play: {provider.capabilities.playback}</Badge>
                  <Badge>DL: {provider.capabilities.download}</Badge>
                  <Badge>Offline: {provider.capabilities.offline}</Badge>
                </div>
                <p style={{ margin: 0, fontSize: "0.76rem", color: "var(--aq-muted)" }}>
                  {provider.restrictionNote}
                </p>
              </article>
            ))}
          </div>
        </Panel>
      )}

      {activeTab === "shortcuts" && (
        <Panel
          title="Keyboard Shortcuts"
          headerActions={
            <Button size="sm" variant="secondary" onClick={resetShortcuts}>
              <RotateCcw size={14} />
              Reset Shortcuts
            </Button>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
            {SHORTCUT_DEFINITIONS.map((def) => {
              const isCapturing = capturingId === def.id;
              return (
                <div key={def.id} className="aq-list-row">
                  <span>{def.label}</span>
                  <div className="aq-row-wrap">
                    <kbd className="aq-kbd">
                      {isCapturing ? "Press key (Esc cancels)..." : bindings[def.id]}
                    </kbd>
                    <Button
                      size="sm"
                      variant="secondary"
                      active={isCapturing}
                      onClick={() => setCapturingId(isCapturing ? null : def.id)}
                    >
                      {isCapturing ? "Cancel" : "Rebind"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {activeTab === "system" && (
        <Panel title="System & Runtime" badge={<Badge>{runtimeStatus}</Badge>} ledActive>
          <div className="aq-kv-list">
            <div className="aq-kv-item">
              <span className="aq-kv-label">Application</span>
              <span className="aq-kv-val">{appInfo?.name ?? "Auraliq"}</span>
            </div>
            <div className="aq-kv-item">
              <span className="aq-kv-label">Version</span>
              <span className="aq-kv-val">{appInfo?.version ?? "0.1.0"}</span>
            </div>
            <div className="aq-kv-item">
              <span className="aq-kv-label">Platform</span>
              <span className="aq-kv-val">
                {appInfo ? `${appInfo.platform} (${appInfo.arch})` : "web-preview"}
              </span>
            </div>
          </div>
        </Panel>
      )}
    </>
  );
}
