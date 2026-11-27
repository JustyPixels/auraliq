import { SlidersHorizontal } from "lucide-react";
import { Badge } from "../components/Badge";
import { EmptyState } from "../components/EmptyState";
import { Panel } from "../components/Panel";
import { ThemePicker } from "../components/ThemePicker";
import type { RuntimeStatus } from "../hooks/useAppInfo";
import type { AppInfo } from "../types/system";

interface SettingsPageProps {
  appInfo: AppInfo | null;
  runtimeStatus: RuntimeStatus;
}

export function SettingsPage({ appInfo, runtimeStatus }: SettingsPageProps) {
  return (
    <>
      <Panel title="Appearance & Themes" ledActive>
        <ThemePicker />
      </Panel>

      <div className="aq-grid-2">
        <Panel title="System & Runtime" badge={<Badge>{runtimeStatus}</Badge>}>
          <div className="aq-kv-list">
            <div className="aq-kv-item">
              <span className="aq-kv-label">Application</span>
              <span className="aq-kv-val">{appInfo?.name ?? "Auraliq"}</span>
            </div>
            <div className="aq-kv-item">
              <span className="aq-kv-label">Version</span>
              <span className="aq-kv-val">{appInfo?.version ?? "0.1.0"}</span>
            </div>
            <div className="aq-kv-item">
              <span className="aq-kv-label">Platform</span>
              <span className="aq-kv-val">
                {appInfo ? `${appInfo.platform} (${appInfo.arch})` : "web-preview"}
              </span>
            </div>
          </div>
        </Panel>

        <Panel title="Upcoming Settings Modules">
          <EmptyState
            icon={<SlidersHorizontal size={20} />}
            title="Playback, Library, Providers & CSS Editor"
            description="Audio device selection, folder scanning, provider credentials, cache limits, and live CSS customization will unlock in Milestones 3–10."
            milestoneTag="Milestones 3–10"
          />
        </Panel>
      </div>
    </>
  );
}
