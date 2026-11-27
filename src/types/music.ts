export type RepeatMode = "off" | "all" | "one";

export interface LibraryFolder {
  id: number;
  path: string;
  added_at: number;
  last_scanned_at: number | null;
}

export interface TrackRecord {
  id: number;
  source_provider: string;
  file_path: string;
  title: string;
  artist: string;
  album: string;
  album_artist: string;
  genre: string;
  duration_ms: number;
  track_number: number | null;
  disc_number: number | null;
  release_year: number | null;
  format: string;
  bitrate_kbps: number | null;
  sample_rate_hz: number | null;
  artwork_path: string | null;
  file_size: number;
  modified_at: number;
  is_missing: boolean;
  play_count: number;
  last_played_at: number | null;
  is_favorite: boolean;
  added_at: number;
}

export interface ArtistSummary {
  name: string;
  track_count: number;
  album_count: number;
}

export interface AlbumSummary {
  name: string;
  artist: string;
  release_year: number | null;
  track_count: number;
  artwork_path: string | null;
}

export interface GenreSummary {
  name: string;
  track_count: number;
}

export interface PlaylistRecord {
  id: number;
  name: string;
  description: string;
  track_count: number;
  created_at: number;
  updated_at: number;
}

export interface PlaybackSnapshot {
  status: string;
  current_path: string | null;
  position_ms: number;
  duration_ms: number;
  volume: number;
  muted: boolean;
  track_ended: boolean;
  last_error: string | null;
}

export interface PlaybackStateRecord {
  current_track_id: number | null;
  position_ms: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat_mode: string;
  queue_track_ids: number[];
  queue_index: number;
}

export interface ScanSummary {
  scanned_files: number;
  added: number;
  updated: number;
  missing: number;
  errors: string[];
}
