use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LibraryFolder {
    pub id: i64,
    pub path: String,
    pub added_at: i64,
    pub last_scanned_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackRecord {
    pub id: i64,
    pub source_provider: String,
    pub file_path: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub album_artist: String,
    pub genre: String,
    pub duration_ms: i64,
    pub track_number: Option<i64>,
    pub disc_number: Option<i64>,
    pub release_year: Option<i64>,
    pub format: String,
    pub bitrate_kbps: Option<i64>,
    pub sample_rate_hz: Option<i64>,
    pub artwork_path: Option<String>,
    pub file_size: i64,
    pub modified_at: i64,
    pub is_missing: bool,
    pub play_count: i64,
    pub last_played_at: Option<i64>,
    pub is_favorite: bool,
    pub added_at: i64,
}

#[derive(Debug, Clone)]
pub struct NewTrackData {
    pub source_provider: String,
    pub file_path: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub album_artist: String,
    pub genre: String,
    pub duration_ms: i64,
    pub track_number: Option<i64>,
    pub disc_number: Option<i64>,
    pub release_year: Option<i64>,
    pub format: String,
    pub bitrate_kbps: Option<i64>,
    pub sample_rate_hz: Option<i64>,
    pub artwork_path: Option<String>,
    pub file_size: i64,
    pub modified_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArtistSummary {
    pub name: String,
    pub track_count: i64,
    pub album_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlbumSummary {
    pub name: String,
    pub artist: String,
    pub release_year: Option<i64>,
    pub track_count: i64,
    pub artwork_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenreSummary {
    pub name: String,
    pub track_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaylistRecord {
    pub id: i64,
    pub name: String,
    pub description: String,
    pub track_count: i64,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaybackStateRecord {
    pub current_track_id: Option<i64>,
    pub position_ms: i64,
    pub volume: f64,
    pub muted: bool,
    pub shuffle: bool,
    pub repeat_mode: String,
    pub queue_track_ids: Vec<i64>,
    pub queue_index: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ScanSummary {
    pub scanned_files: usize,
    pub added: usize,
    pub updated: usize,
    pub missing: usize,
    pub errors: Vec<String>,
}
