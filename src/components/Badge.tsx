import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "accent" | "ok" | "warn";

export interface BadgeProps {
  tone?: BadgeTone;
  dot?: boolean;
  children: ReactNode;
}

export function Badge({ tone = "neutral", dot = false, children }: BadgeProps) {
  return (
    <span className={`aq-badge aq-badge--${tone}`}>
      {dot && <span className={`aq-led ${tone === "ok" ? "aq-led--on" : ""}`} aria-hidden="true" />}
      {children}
    </span>
  );
}
