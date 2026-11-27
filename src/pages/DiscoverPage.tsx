import { Compass, Play, Shuffle } from "lucide-react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Panel } from "../components/Panel";
import { useLibraryStore } from "../stores/useLibraryStore";
import { usePlayerStore } from "../stores/usePlayerStore";

export function DiscoverPage() {
  const { tracks, genres } = useLibraryStore();
  const playTrackList = usePlayerStore((state) => state.playTrackList);

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
          simulated AI). Online provider discovery arrives in Milestone 8.
        </p>
      </Panel>

      {tracks.length === 0 ? (
        <Panel title="Ready to Discover">
          <EmptyState
            icon={<Compass size={20} />}
            title="No Tracks Indexed Yet"
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
