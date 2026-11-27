import { Compass, ListPlus, Music, Play, Radio, RefreshCw, Shuffle } from "lucide-react";
import { useEffect, useState } from "react";
import { backendApi, formatDurationMs, isTauriRuntime } from "../api/backend";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Panel } from "../components/Panel";
import { useLibraryStore } from "../stores/useLibraryStore";
import { usePlayerStore } from "../stores/usePlayerStore";
import type { OnlineTrack } from "../types/providers";

export function DiscoverPage() {
  const { tracks, genres } = useLibraryStore();
  const { playTrackList, playOnlineTrackList, addOnlineToQueue } = usePlayerStore();
  const inTauri = isTauriRuntime();

  const [onlineFeed, setOnlineFeed] = useState<OnlineTrack[]>([]);
  const [onlineSource, setOnlineSource] = useState<"audius" | "radio_browser">("audius");
  const [loadingOnline, setLoadingOnline] = useState(false);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [directUrl, setDirectUrl] = useState("");

  const loadOnlineFeed = async (source: "audius" | "radio_browser") => {
    setOnlineSource(source);
    if (!inTauri) {
      return;
    }
    setLoadingOnline(true);
    setOnlineError(null);
    try {
      const res = await backendApi.searchProvider(source, "", 10);
      setOnlineFeed(res.tracks);
    } catch (err) {
      setOnlineError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingOnline(false);
    }
  };

  useEffect(() => {
    if (inTauri) {
      void loadOnlineFeed("audius");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inTauri]);

  const handlePlayDirectUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = directUrl.trim();
    if (!trimmed) {
      return;
    }
    void playOnlineTrackList(
      [
        {
          provider_id: "direct_url",
          external_id: trimmed,
          title: trimmed.split("/").pop() || "Direct Stream",
          artist: "Direct URL",
          album: "Online Stream",
          duration_ms: 0,
          stream_url: trimmed,
          artwork_url: null,
          external_url: trimmed,
          license: null,
          downloadable: false,
        },
      ],
      0,
    );
  };

  const recentlyAdded = [...tracks].sort((a, b) => b.added_at - a.added_at).slice(0, 6);
  const topPlayed = [...tracks]
    .filter((t) => t.play_count > 0)
    .sort((a, b) => b.play_count - a.play_count)
    .slice(0, 6);
  const neverPlayed = tracks.filter((t) => t.play_count === 0).slice(0, 6);

  const handleShuffleRandom = () => {
    if (tracks.length === 0) {
      return;
    }
    const pool = [...tracks].sort(() => Math.random() - 0.5).slice(0, 10);
    void playTrackList(pool, 0);
  };

  return (
    <>
      <Panel
        title="Online Stream Deck"
        ledActive={onlineFeed.length > 0}
        badge={<Badge tone="accent">{onlineSource === "audius" ? "Audius" : "Radio"}</Badge>}
        headerActions={
          <div className="aq-row-wrap">
            <Button
              size="sm"
              variant="secondary"
              active={onlineSource === "audius"}
              onClick={() => void loadOnlineFeed("audius")}
            >
              <Music size={14} />
              Audius Trending
            </Button>
            <Button
              size="sm"
              variant="secondary"
              active={onlineSource === "radio_browser"}
              onClick={() => void loadOnlineFeed("radio_browser")}
            >
              <Radio size={14} />
              Top Live Radio
            </Button>
            <Button
              size="icon"
              variant="ghost"
              disabled={!inTauri || loadingOnline}
              aria-label="Refresh online feed"
              onClick={() => void loadOnlineFeed(onlineSource)}
            >
              <RefreshCw size={14} />
            </Button>
          </div>
        }
      >
        <form
          onSubmit={handlePlayDirectUrl}
          className="aq-row-wrap"
          style={{ marginBottom: "1rem" }}
        >
          <input
            type="url"
            className="aq-input"
            style={{ flex: 1, minWidth: "220px" }}
            placeholder="Paste a direct HTTPS audio/radio URL (.mp3, .ogg, .flac)..."
            aria-label="Direct audio stream URL"
            value={directUrl}
            onChange={(e) => setDirectUrl(e.target.value)}
          />
          <Button
            type="submit"
            size="sm"
            variant="primary"
            disabled={!inTauri || !directUrl.trim()}
          >
            <Play size={14} />
            Play URL
          </Button>
        </form>

        {onlineError && (
          <p role="alert" style={{ color: "var(--aq-warn)", marginTop: 0 }}>
            {onlineError}
          </p>
        )}

        {onlineFeed.length > 0 ? (
          <div className="aq-track-list">
            {onlineFeed.map((track, idx) => (
              <div key={`${track.provider_id}-${track.external_id}`} className="aq-track-row">
                <div className="aq-thumb">
                  {track.artwork_url ? <img src={track.artwork_url} alt="" /> : <Music size={16} />}
                </div>
                <div className="aq-truncate">
                  <strong>{track.title}</strong>
                  <div style={{ fontSize: "0.76rem", color: "var(--aq-muted)" }}>
                    {track.artist}
                  </div>
                </div>
                <div className="aq-truncate" style={{ color: "var(--aq-muted)" }}>
                  {track.album}
                </div>
                <Badge tone="accent">{track.provider_id.toUpperCase()}</Badge>
                <span className="aq-timecode">
                  {track.duration_ms > 0 ? formatDurationMs(track.duration_ms) : "LIVE"}
                </span>
                <div className="aq-row-wrap">
                  <Button
                    size="icon"
                    variant="primary"
                    aria-label={`Play ${track.title}`}
                    onClick={() => void playOnlineTrackList(onlineFeed, idx)}
                  >
                    <Play size={14} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Add ${track.title} to queue`}
                    onClick={() => addOnlineToQueue(track)}
                  >
                    <ListPlus size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Radio size={20} />}
            title={
              loadingOnline
                ? "Tuning into Online Streams..."
                : inTauri
                  ? "Select an Online Feed"
                  : "Online Streaming Ready on Desktop"
            }
            description="Audius Trending and Radio Browser stations stream directly in Auraliq with zero account required."
          />
        )}
      </Panel>

      <Panel
        title="Local Discovery"
        ledActive={tracks.length > 0}
        badge={<Badge>Local Library</Badge>}
        headerActions={
          <Button
            size="sm"
            variant="primary"
            disabled={tracks.length === 0}
            title={
              tracks.length === 0
                ? "Add local tracks first"
                : "Shuffle 10 random tracks from your library"
            }
            onClick={handleShuffleRandom}
          >
            <Shuffle size={14} />
            Shuffle 10 Random
          </Button>
        }
      >
        <p style={{ margin: 0, fontSize: "0.86rem", color: "var(--aq-muted)" }}>
          Powered by your local SQLite library &amp; listening history (no external tracking or
          simulated AI).
        </p>
      </Panel>

      {tracks.length === 0 ? (
        <Panel title="Local Library Discovery">
          <EmptyState
            icon={<Compass size={20} />}
            title="No Local Tracks Indexed Yet"
            description="Scan a local music folder in Library to unlock Recently Added, Top Played, Never Played, and Genre Mixes."
          />
        </Panel>
      ) : (
        <div className="aq-grid-2">
          <Panel title="Recently Added">
            <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
              {recentlyAdded.map((t, idx) => (
                <div key={t.id} className="aq-list-row">
                  <span className="aq-truncate">
                    <strong>{t.title}</strong> — {t.artist}
                  </span>
                  <Button
                    size="icon"
                    variant="secondary"
                    aria-label={`Play ${t.title}`}
                    onClick={() => void playTrackList(recentlyAdded, idx)}
                  >
                    <Play size={13} />
                  </Button>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Top Played Locally">
            <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
              {topPlayed.length === 0 ? (
                <span style={{ fontSize: "0.84rem", color: "var(--aq-muted)" }}>
                  Play tracks to populate your local listening leaderboard.
                </span>
              ) : (
                topPlayed.map((t, idx) => (
                  <div key={t.id} className="aq-list-row">
                    <span className="aq-truncate">
                      <strong>{t.title}</strong> ({t.play_count}x)
                    </span>
                    <Button
                      size="icon"
                      variant="secondary"
                      aria-label={`Play ${t.title}`}
                      onClick={() => void playTrackList(topPlayed, idx)}
                    >
                      <Play size={13} />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Panel>

          <Panel title="Rediscover (Never Played)">
            <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
              {neverPlayed.map((t, idx) => (
                <div key={t.id} className="aq-list-row">
                  <span className="aq-truncate">
                    <strong>{t.title}</strong> — {t.artist}
                  </span>
                  <Button
                    size="icon"
                    variant="secondary"
                    aria-label={`Play ${t.title}`}
                    onClick={() => void playTrackList(neverPlayed, idx)}
                  >
                    <Play size={13} />
                  </Button>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Genres in Your Library">
            <div className="aq-row-wrap">
              {genres.map((g) => (
                <Badge key={g.name} tone="accent">
                  {g.name} ({g.track_count})
                </Badge>
              ))}
            </div>
          </Panel>
        </div>
      )}
    </>
  );
}
