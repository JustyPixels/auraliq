import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  active?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "secondary",
  size = "md",
  active = false,
  className = "",
  type = "button",
  children,
  ...rest
}: ButtonProps) {
  const classes = [
    "aq-btn",
    `aq-btn--${variant}`,
    `aq-btn--${size}`,
    active ? "aq-btn--active" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}
