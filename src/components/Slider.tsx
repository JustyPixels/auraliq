import type { InputHTMLAttributes } from "react";

export interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

export function Slider({ label, className = "", ...rest }: SliderProps) {
  return (
    <input type="range" aria-label={label} className={`aq-slider ${className}`.trim()} {...rest} />
  );
}
