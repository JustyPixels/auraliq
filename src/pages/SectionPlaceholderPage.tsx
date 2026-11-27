import { EmptyState } from "../components/EmptyState";
import { Panel } from "../components/Panel";
import type { NavItem } from "../layouts/nav";

interface SectionPlaceholderPageProps {
  item: NavItem;
}

export function SectionPlaceholderPage({ item }: SectionPlaceholderPageProps) {
  const Icon = item.icon;
  return (
    <Panel title={item.label}>
      <EmptyState
        icon={<Icon size={20} />}
        title={`${item.label} — Scheduled`}
        description={
          item.description ??
          "This section is part of the Auraliq layout shell and will be implemented in an upcoming milestone."
        }
        milestoneTag={item.plannedMilestone ?? "Upcoming"}
      />
    </Panel>
  );
}
