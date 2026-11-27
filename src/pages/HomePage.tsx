import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Panel } from "../components/Panel";
import { ThemePicker } from "../components/ThemePicker";
import type { RuntimeStatus } from "../hooks/useAppInfo";
import type { AppInfo } from "../types/system";

interface HomePageProps {
  appInfo: AppInfo | null;
  runtimeStatus: RuntimeStatus;
  ipcError: string | null;
  onOpenSettings: () => void;
}

export function HomePage({ appInfo, runtimeStatus, ipcError, onOpenSettings }: HomePageProps) {
  return (
    <>
      <Panel
        title="Signal Deck"
        badge={<Badge tone="accent">v{appInfo?.version ?? "0.1.0"}</Badge>}
        ledActive={runtimeStatus === "tauri"}
        headerActions={
          <Button size="sm" variant="secondary" onClick={onOpenSettings}>
            Open Settings
          </Button>
        }
      >
        <div className="aq-hero-banner">
          <div>
            <h2 className="aq-hero-title">Auraliq</h2>
            <p className="aq-hero-sub">
              Your music. Your frequency. Local-first retro music hub built with Rust &amp; Tauri
              v2.
            </p>
          </div>
          <div className="aq-kv-list" style={{ minWidth: "280px" }}>
            <div className="aq-kv-item">
              <span className="aq-kv-label">Runtime</span>
              <span className="aq-kv-val">
                {appInfo ? `${appInfo.platform} (${appInfo.arch})` : "web-preview"}
              </span>
            </div>
            <div className="aq-kv-item">
              <span className="aq-kv-label">Milestone</span>
              <span className="aq-kv-val">M2 Design System</span>
            </div>
          </div>
        </div>
        {ipcError && (
          <p
            role="alert"
            style={{ color: "var(--aq-warn)", marginTop: "0.75rem", marginBottom: 0 }}
          >
            IPC error: {ipcError}
          </p>
        )}
      </Panel>

      <Panel title="Quick Theme Switcher" ledActive>
        <ThemePicker />
      </Panel>
    </>
  );
}
