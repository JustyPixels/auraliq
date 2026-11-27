import type { ReactNode } from "react";

export interface PanelProps {
  title?: string;
  badge?: ReactNode;
  ledActive?: boolean;
  headerActions?: ReactNode;
  children: ReactNode;
}

export function Panel({ title, badge, ledActive = false, headerActions, children }: PanelProps) {
  return (
    <section className="aq-panel">
      {(title || badge || headerActions) && (
        <header className="aq-panel__header">
          <div className="aq-panel__title-wrap">
            <span className={`aq-led ${ledActive ? "aq-led--on" : ""}`} aria-hidden="true" />
            {title && <h2 className="aq-panel__title">{title}</h2>}
            {badge}
          </div>
          {headerActions && <div>{headerActions}</div>}
        </header>
      )}
      <div className="aq-panel__body">{children}</div>
    </section>
  );
}
