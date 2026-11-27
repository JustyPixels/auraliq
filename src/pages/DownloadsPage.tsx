import {
  Download,
  FolderOpen,
  HardDrive,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Trash2,
  WifiOff,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatBytes, isTauriRuntime, pickDownloadFolder } from "../api/backend";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Panel } from "../components/Panel";
import { useDownloadsStore } from "../stores/useDownloadsStore";
import { useLibraryStore } from "../stores/useLibraryStore";

export function DownloadsPage() {
  const {
    downloads,
    downloadSettings,
    cacheStats,
    cacheEntries,
    error,
    refreshAll,
    refreshDownloads,
    pauseDownload,
    resumeDownload,
    retryDownload,
    cancelDownload,
    removeDownload,
    clearCompleted,
    updateDownloadSettings,
    updateCacheSettings,
    clearCache,
    removeCacheEntry,
    runCacheCleanup,
  } = useDownloadsStore();

  const refreshLibrary = useLibraryStore((state) => state.refreshLibrary);
  const inTauri = isTauriRuntime();

  const [namingTemplate, setNamingTemplate] = useState("{artist} - {title}");
  const [maxConcurrent, setMaxConcurrent] = useState(2);
  const [maxCacheMb, setMaxCacheMb] = useState(512);
  const [ttlHours, setTtlHours] = useState(72);

  const prevCompletedCountRef = useRef(0);

  useEffect(() => {
    if (inTauri) {
      void refreshAll();
    }
  }, [inTauri, refreshAll]);

  useEffect(() => {
    if (downloadSettings) {
      setNamingTemplate(downloadSettings.naming_template);
      setMaxConcurrent(downloadSettings.max_concurrent);
    }
  }, [downloadSettings]);

  useEffect(() => {
    if (cacheStats) {
      setMaxCacheMb(cacheStats.max_size_mb);
      setTtlHours(cacheStats.ttl_hours);
    }
  }, [cacheStats]);

  const hasActiveDownloads = downloads.some(
    (d) => d.status === "queued" || d.status === "downloading",
  );

  useEffect(() => {
    if (!inTauri || !hasActiveDownloads) {
      return;
    }
    const timer = window.setInterval(() => {
      void refreshDownloads();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [hasActiveDownloads, inTauri, refreshDownloads]);

  useEffect(() => {
    const completedCount = downloads.filter((d) => d.status === "completed").length;
    if (completedCount > prevCompletedCountRef.current && inTauri) {
      void refreshLibrary();
    }
    prevCompletedCountRef.current = completedCount;
  }, [downloads, inTauri, refreshLibrary]);

  const handlePickDownloadDir = async () => {
    if (!downloadSettings) {
      return;
    }
    const picked = await pickDownloadFolder();
    if (picked) {
      await updateDownloadSettings({ ...downloadSettings, download_dir: picked });
    }
  };

  const handleSaveDownloadSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!downloadSettings) {
      return;
    }
    await updateDownloadSettings({
      ...downloadSettings,
      max_concurrent: maxConcurrent,
      naming_template: namingTemplate.trim() || "{artist} - {title}",
    });
  };

  const handleSaveCacheSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cacheStats) {
      return;
    }
    await updateCacheSettings({
      enabled: cacheStats.enabled,
      offline_mode: cacheStats.offline_mode,
      max_size_mb: maxCacheMb,
      ttl_hours: ttlHours,
    });
  };

  const cacheUsagePct =
    cacheStats && cacheStats.max_bytes > 0
      ? Math.min(100, Math.round((cacheStats.total_bytes / cacheStats.max_bytes) * 100))
      : 0;

  return (
    <>
      {error && (
        <Panel title="Transfer Notice">
          <p role="alert" style={{ color: "var(--aq-warn)", margin: 0 }}>
            {error}
          </p>
        </Panel>
      )}

      <div className="aq-grid-2">
        <Panel
          title="Download Queue"
          ledActive={hasActiveDownloads}
          badge={<Badge tone="accent">{downloads.length} items</Badge>}
          headerActions={
            <div className="aq-row-wrap">
              <Button
                size="sm"
                variant="secondary"
                disabled={!inTauri}
                onClick={() => void refreshDownloads()}
              >
                <RefreshCw size={14} />
                Refresh
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={!inTauri || downloads.length === 0}
                onClick={() => void clearCompleted()}
              >
                <Trash2 size={14} />
                Clear Finished
              </Button>
            </div>
          }
        >
          {downloads.length === 0 ? (
            <EmptyState
              icon={<Download size={20} />}
              title="No Downloads Queued"
              description="Permanent downloads are permitted exclusively for open/CC sources such as Internet Archive and artist-approved Jamendo tracks. Use Search to queue permitted tracks."
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
              {downloads.map((item) => {
                const pct =
                  item.total_bytes && item.total_bytes > 0
                    ? Math.min(100, Math.round((item.bytes_downloaded / item.total_bytes) * 100))
                    : null;
                return (
                  <div key={item.id} className="aq-list-row" style={{ alignItems: "flex-start" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="aq-row-wrap">
                        <strong className="aq-truncate">{item.title}</strong>
                        <Badge
                          tone={
                            item.status === "completed"
                              ? "ok"
                              : item.status === "failed"
                                ? "warn"
                                : "accent"
                          }
                        >
                          {item.status.toUpperCase()}
                        </Badge>
                        <Badge>{item.provider_id}</Badge>
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--aq-muted)" }}>
                        {item.artist} • {formatBytes(item.bytes_downloaded)}
                        {item.total_bytes ? ` / ${formatBytes(item.total_bytes)}` : ""}
                        {pct !== null ? ` (${pct}%)` : ""}
                      </div>
                      {item.error_message && (
                        <div style={{ fontSize: "0.76rem", color: "var(--aq-warn)" }}>
                          {item.error_message}
                        </div>
                      )}
                    </div>

                    <div className="aq-row-wrap">
                      {(item.status === "downloading" || item.status === "queued") && (
                        <Button
                          size="icon"
                          variant="secondary"
                          aria-label={`Pause ${item.title}`}
                          onClick={() => void pauseDownload(item.id)}
                        >
                          <Pause size={14} />
                        </Button>
                      )}
                      {item.status === "paused" && (
                        <Button
                          size="icon"
                          variant="primary"
                          aria-label={`Resume ${item.title}`}
                          onClick={() => void resumeDownload(item.id)}
                        >
                          <Play size={14} />
                        </Button>
                      )}
                      {(item.status === "failed" || item.status === "canceled") && (
                        <Button
                          size="icon"
                          variant="secondary"
                          aria-label={`Retry ${item.title}`}
                          onClick={() => void retryDownload(item.id)}
                        >
                          <RotateCcw size={14} />
                        </Button>
                      )}
                      {(item.status === "queued" ||
                        item.status === "downloading" ||
                        item.status === "paused") && (
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Cancel ${item.title}`}
                          onClick={() => void cancelDownload(item.id)}
                        >
                          <X size={14} />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Remove ${item.title}`}
                        onClick={() => void removeDownload(item.id, false)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel
          title="Temporary Playback Cache"
          ledActive={Boolean(cacheStats?.enabled)}
          badge={
            <Badge tone={cacheStats?.offline_mode ? "warn" : "accent"}>
              {cacheStats?.offline_mode ? "Offline Mode" : `${cacheStats?.entry_count ?? 0} cached`}
            </Badge>
          }
          headerActions={
            <div className="aq-row-wrap">
              <Button
                size="sm"
                variant="secondary"
                disabled={!inTauri}
                onClick={() => void runCacheCleanup()}
              >
                <RefreshCw size={14} />
                Evict Expired
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={!inTauri || cacheEntries.length === 0}
                onClick={() => void clearCache()}
              >
                <Trash2 size={14} />
                Clear Cache
              </Button>
            </div>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--aq-muted)" }}>
              Temporary LRU cache for permitted online streams (separate from permanent downloads).
              Expired or least-recently-used streams are evicted automatically.
            </p>

            <div className="aq-row-wrap">
              <Button
                size="sm"
                variant="secondary"
                active={Boolean(cacheStats?.offline_mode)}
                disabled={!inTauri || !cacheStats}
                onClick={() =>
                  cacheStats &&
                  void updateCacheSettings({
                    enabled: cacheStats.enabled,
                    max_size_mb: cacheStats.max_size_mb,
                    ttl_hours: cacheStats.ttl_hours,
                    offline_mode: !cacheStats.offline_mode,
                  })
                }
              >
                <WifiOff size={14} />
                Offline Mode: {cacheStats?.offline_mode ? "On" : "Off"}
              </Button>

              <Button
                size="sm"
                variant="secondary"
                active={Boolean(cacheStats?.enabled)}
                disabled={!inTauri || !cacheStats}
                onClick={() =>
                  cacheStats &&
                  void updateCacheSettings({
                    enabled: !cacheStats.enabled,
                    max_size_mb: cacheStats.max_size_mb,
                    ttl_hours: cacheStats.ttl_hours,
                    offline_mode: cacheStats.offline_mode,
                  })
                }
              >
                <HardDrive size={14} />
                Stream Cache: {cacheStats?.enabled ? "Enabled" : "Disabled"}
              </Button>
            </div>

            <div className="aq-kv-item">
              <span className="aq-kv-label">
                Cache Usage:{" "}
                {cacheStats
                  ? `${formatBytes(cacheStats.total_bytes)} / ${cacheStats.max_size_mb} MB (${cacheUsagePct}%)`
                  : "0 B / 512 MB"}
              </span>
            </div>

            <form onSubmit={(e) => void handleSaveCacheSettings(e)} className="aq-row-wrap">
              <label className="aq-kv-label" htmlFor="aq-cache-max-mb">
                Max MB
              </label>
              <input
                id="aq-cache-max-mb"
                type="number"
                min={32}
                max={8192}
                className="aq-input"
                style={{ width: "90px" }}
                disabled={!inTauri}
                value={maxCacheMb}
                onChange={(e) => setMaxCacheMb(Number(e.target.value))}
              />
              <label className="aq-kv-label" htmlFor="aq-cache-ttl-hours">
                TTL (hours)
              </label>
              <input
                id="aq-cache-ttl-hours"
                type="number"
                min={1}
                max={720}
                className="aq-input"
                style={{ width: "80px" }}
                disabled={!inTauri}
                value={ttlHours}
                onChange={(e) => setTtlHours(Number(e.target.value))}
              />
              <Button type="submit" size="sm" variant="primary" disabled={!inTauri}>
                Save Cache Limits
              </Button>
            </form>

            {cacheEntries.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {cacheEntries.slice(0, 8).map((entry) => (
                  <div key={entry.cache_key} className="aq-list-row">
                    <span className="aq-truncate">
                      <strong>{entry.title}</strong> — {entry.artist} (
                      {formatBytes(entry.size_bytes)})
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Evict ${entry.title}`}
                      onClick={() => void removeCacheEntry(entry.cache_key)}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Panel>
      </div>

      <Panel title="Download Settings & Lofty Auto-Tagging">
        <form
          onSubmit={(e) => void handleSaveDownloadSettings(e)}
          style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}
        >
          <div className="aq-row-wrap">
            <span className="aq-kv-label" style={{ margin: 0 }}>
              Target Folder:
            </span>
            <code style={{ fontSize: "0.8rem" }}>
              {downloadSettings?.download_dir || "AppLocalData/downloads"}
            </code>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={!inTauri}
              onClick={() => void handlePickDownloadDir()}
            >
              <FolderOpen size={14} />
              Choose Folder
            </Button>
          </div>

          <div className="aq-row-wrap">
            <label className="aq-kv-label" htmlFor="aq-dl-template">
              Naming Template
            </label>
            <input
              id="aq-dl-template"
              type="text"
              className="aq-input"
              style={{ flex: 1, minWidth: "200px" }}
              disabled={!inTauri}
              value={namingTemplate}
              onChange={(e) => setNamingTemplate(e.target.value)}
            />
            <label className="aq-kv-label" htmlFor="aq-dl-concurrent">
              Concurrency
            </label>
            <input
              id="aq-dl-concurrent"
              type="number"
              min={1}
              max={4}
              className="aq-input"
              style={{ width: "70px" }}
              disabled={!inTauri}
              value={maxConcurrent}
              onChange={(e) => setMaxConcurrent(Number(e.target.value))}
            />
            <Button type="submit" size="sm" variant="primary" disabled={!inTauri}>
              Save Download Settings
            </Button>
          </div>

          <div className="aq-row-wrap">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              active={Boolean(downloadSettings?.auto_tag)}
              disabled={!inTauri || !downloadSettings}
              onClick={() =>
                downloadSettings &&
                void updateDownloadSettings({
                  ...downloadSettings,
                  auto_tag: !downloadSettings.auto_tag,
                })
              }
            >
              Lofty Auto-Tag: {downloadSettings?.auto_tag ? "On" : "Off"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              active={Boolean(downloadSettings?.auto_add_to_library)}
              disabled={!inTauri || !downloadSettings}
              onClick={() =>
                downloadSettings &&
                void updateDownloadSettings({
                  ...downloadSettings,
                  auto_add_to_library: !downloadSettings.auto_add_to_library,
                })
              }
            >
              Auto-Add to Local Library: {downloadSettings?.auto_add_to_library ? "On" : "Off"}
            </Button>
          </div>
        </form>
      </Panel>
    </>
  );
}
