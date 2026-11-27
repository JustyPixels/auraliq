import { RotateCw, X } from "lucide-react";
import { useEffect } from "react";
import { usePlayerStore } from "../stores/usePlayerStore";
import { Button } from "./Button";

export function PlaybackToast() {
  const { toastMessage, dismissToast, retryCurrentTrack } = usePlayerStore();

  useEffect(() => {
    if (!toastMessage || toastMessage.tone === "warn") {
      return;
    }
    const timer = window.setTimeout(() => {
      dismissToast();
    }, 3500);
    return () => window.clearTimeout(timer);
  }, [dismissToast, toastMessage]);

  if (!toastMessage) {
    return null;
  }

  return (
    <aside
      className={`aq-toast ${toastMessage.tone === "warn" ? "aq-toast--warn" : ""}`}
      role="status"
      aria-live="polite"
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="aq-truncate" style={{ fontWeight: 600, fontSize: "0.84rem" }}>
          {toastMessage.title}
        </div>
        <div className="aq-truncate" style={{ fontSize: "0.75rem", color: "var(--aq-muted)" }}>
          {toastMessage.subtitle}
        </div>
      </div>

      {toastMessage.tone === "warn" && (
        <Button size="sm" variant="secondary" onClick={() => void retryCurrentTrack()}>
          <RotateCw size={13} />
          Retry
        </Button>
      )}
      <Button size="icon" variant="ghost" aria-label="Dismiss notification" onClick={dismissToast}>
        <X size={14} />
      </Button>
    </aside>
  );
}
