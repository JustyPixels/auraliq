interface BrandMarkProps {
  size?: number;
  showWordmark?: boolean;
}

export function BrandMark({ size = 28, showWordmark = true }: BrandMarkProps) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.6rem" }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 512 512"
        fill="none"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <rect width="512" height="512" rx="108" fill="#171324" stroke="#3B305B" strokeWidth="14" />
        <circle cx="398" cy="114" r="16" fill="var(--aq-secondary-accent, #38BDF8)" />
        <rect x="122" y="216" width="38" height="104" rx="10" fill="var(--aq-accent, #8B5CF6)" />
        <rect x="178" y="156" width="38" height="224" rx="10" fill="var(--aq-accent, #8B5CF6)" />
        <rect x="237" y="108" width="38" height="304" rx="10" fill="#E9D5FF" />
        <rect x="296" y="156" width="38" height="224" rx="10" fill="var(--aq-accent, #8B5CF6)" />
        <rect x="352" y="216" width="38" height="104" rx="10" fill="var(--aq-accent, #8B5CF6)" />
      </svg>
      {showWordmark && (
        <span
          style={{
            fontFamily: "var(--aq-font-display)",
            fontWeight: 700,
            letterSpacing: "0.14em",
            fontSize: "0.95rem",
          }}
        >
          AURALIQ
        </span>
      )}
    </span>
  );
}
