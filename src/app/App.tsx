import { useAppInfo } from "../hooks/useAppInfo";

export function App() {
  const { info, status, error } = useAppInfo();

  const statusLabel =
    status === "tauri"
      ? "Tauri IPC Connected"
      : status === "browser-preview"
        ? "Browser Preview"
        : status === "error"
          ? "IPC Error"
          : "Connecting...";

  return (
    <main className="aq-foundation">
      <section className="aq-card" aria-label="Auraliq Foundation">
        <header className="aq-header">
          <h1 className="aq-title">Auraliq</h1>
          <span className="aq-badge" data-status={status}>
            {statusLabel}
          </span>
        </header>

        <p className="aq-tagline">Your music. Your frequency.</p>

        <div className="aq-meta">
          <div className="aq-meta-item">
            <span className="aq-meta-label">Version</span>
            <span className="aq-meta-value">{info?.version ?? "0.1.0"}</span>
          </div>
          <div className="aq-meta-item">
            <span className="aq-meta-label">Platform</span>
            <span className="aq-meta-value">
              {info ? `${info.platform} (${info.arch})` : "web-preview"}
            </span>
          </div>
        </div>

        {error ? (
          <p className="aq-notice" role="alert">
            Backend IPC error: {error}
          </p>
        ) : (
          <p className="aq-notice">
            Milestone 1 Foundation active. Audio playback, local library scanning, and provider
            integrations are scheduled for upcoming milestones.
          </p>
        )}
      </section>
    </main>
  );
}
