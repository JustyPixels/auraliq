import { PanelLeftClose, PanelLeftOpen, Pin } from "lucide-react";
import { useRef } from "react";
import { BrandMark } from "../components/BrandMark";
import { Button } from "../components/Button";
import { MAX_SIDEBAR_WIDTH, MIN_SIDEBAR_WIDTH } from "../stores/useLayoutStore";
import { NAV_GROUPS, NAV_ITEMS, type NavItem, type NavSectionId } from "./nav";

interface SidebarProps {
  activeSection: NavSectionId;
  collapsed: boolean;
  sidebarWidth: number;
  navOrder: NavSectionId[];
  hiddenSections: NavSectionId[];
  pinnedSections: NavSectionId[];
  onSelectSection: (section: NavSectionId) => void;
  onToggleCollapse: () => void;
  onResizeSidebar: (width: number) => void;
}

const ITEM_MAP = new Map<NavSectionId, NavItem>(NAV_ITEMS.map((item) => [item.id, item]));

export function Sidebar({
  activeSection,
  collapsed,
  sidebarWidth,
  navOrder,
  hiddenSections,
  pinnedSections,
  onSelectSection,
  onToggleCollapse,
  onResizeSidebar,
}: SidebarProps) {
  const dragStartRef = useRef<{ x: number; width: number } | null>(null);

  const visibleOrdered = navOrder
    .filter((id) => !hiddenSections.includes(id))
    .map((id) => ITEM_MAP.get(id))
    .filter((item): item is NavItem => Boolean(item));

  const pinnedItems = visibleOrdered.filter((item) => pinnedSections.includes(item.id));

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (collapsed) {
      return;
    }
    event.preventDefault();
    dragStartRef.current = { x: event.clientX, width: sidebarWidth };

    const handleMove = (moveEvent: PointerEvent) => {
      if (!dragStartRef.current) {
        return;
      }
      const delta = moveEvent.clientX - dragStartRef.current.x;
      onResizeSidebar(dragStartRef.current.width + delta);
    };

    const handleUp = () => {
      dragStartRef.current = null;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const handleResizerKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      onResizeSidebar(sidebarWidth - 16);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      onResizeSidebar(sidebarWidth + 16);
    }
  };

  const renderNavButton = (item: NavItem, showPinIcon = false) => {
    const Icon = item.icon;
    const isActive = item.id === activeSection;
    return (
      <button
        key={`${showPinIcon ? "pin-" : ""}${item.id}`}
        type="button"
        title={collapsed ? item.label : undefined}
        aria-current={isActive ? "page" : undefined}
        className={`aq-nav-item ${isActive ? "aq-nav-item--active" : ""}`}
        onClick={() => onSelectSection(item.id)}
      >
        <Icon size={17} aria-hidden="true" />
        {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
        {!collapsed && showPinIcon && (
          <Pin size={12} aria-hidden="true" style={{ color: "var(--aq-muted)" }} />
        )}
      </button>
    );
  };

  return (
    <aside
      className={`aq-sidebar ${collapsed ? "aq-sidebar--collapsed" : ""}`}
      aria-label="Primary navigation"
    >
      <div className="aq-sidebar__brand">
        <BrandMark size={28} showWordmark={!collapsed} />
        <Button
          size="icon"
          variant="ghost"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={onToggleCollapse}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </Button>
      </div>

      <nav className="aq-sidebar__nav">
        {pinnedItems.length > 0 && (
          <div>
            {!collapsed && <div className="aq-nav-group__label">Pinned</div>}
            <div className="aq-nav-list">
              {pinnedItems.map((item) => renderNavButton(item, true))}
            </div>
          </div>
        )}

        {NAV_GROUPS.map((group) => {
          const items = visibleOrdered.filter((item) => item.group === group);
          if (items.length === 0) {
            return null;
          }
          return (
            <div key={group}>
              {!collapsed && <div className="aq-nav-group__label">{group}</div>}
              <div className="aq-nav-list">{items.map((item) => renderNavButton(item))}</div>
            </div>
          );
        })}
      </nav>

      {!collapsed && (
        <div
          role="separator"
          tabIndex={0}
          aria-orientation="vertical"
          aria-label="Resize sidebar"
          aria-valuemin={MIN_SIDEBAR_WIDTH}
          aria-valuemax={MAX_SIDEBAR_WIDTH}
          aria-valuenow={sidebarWidth}
          className="aq-sidebar-resizer"
          onPointerDown={handlePointerDown}
          onKeyDown={handleResizerKeyDown}
        />
      )}
    </aside>
  );
}
