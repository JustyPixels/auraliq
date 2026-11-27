import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { BrandMark } from "../components/BrandMark";
import { Button } from "../components/Button";
import { NAV_GROUPS, NAV_ITEMS, type NavSectionId } from "./nav";

interface SidebarProps {
  activeSection: NavSectionId;
  collapsed: boolean;
  onSelectSection: (section: NavSectionId) => void;
  onToggleCollapse: () => void;
}

export function Sidebar({
  activeSection,
  collapsed,
  onSelectSection,
  onToggleCollapse,
}: SidebarProps) {
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
        {NAV_GROUPS.map((group) => {
          const items = NAV_ITEMS.filter((item) => item.group === group);
          return (
            <div key={group}>
              {!collapsed && <div className="aq-nav-group__label">{group}</div>}
              <div className="aq-nav-list">
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.id === activeSection;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      title={collapsed ? item.label : undefined}
                      aria-current={isActive ? "page" : undefined}
                      className={`aq-nav-item ${isActive ? "aq-nav-item--active" : ""}`}
                      onClick={() => onSelectSection(item.id)}
                    >
                      <Icon size={17} aria-hidden="true" />
                      {!collapsed && <span>{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
