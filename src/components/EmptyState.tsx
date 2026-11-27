import type { ReactNode } from "react";
import { Badge } from "./Badge";

export interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  milestoneTag?: string;
}

export function EmptyState({ icon, title, description, milestoneTag }: EmptyStateProps) {
  return (
    <div className="aq-empty-state">
      <div className="aq-empty-state__icon" aria-hidden="true">
        {icon}
      </div>
      {milestoneTag && <Badge tone="accent">{milestoneTag}</Badge>}
      <h3 className="aq-empty-state__title">{title}</h3>
      <p className="aq-empty-state__desc">{description}</p>
    </div>
  );
}
