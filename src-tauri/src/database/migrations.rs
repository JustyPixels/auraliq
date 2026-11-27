use rusqlite::Connection;

use crate::error::AppError;

const MIGRATION_V1: &str = r#"
CREATE TABLE IF NOT EXISTS library_folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL UNIQUE,
    added_at INTEGER NOT NULL,
    last_scanned_at INTEGER
);

CREATE TABLE IF NOT EXISTS tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_provider TEXT NOT NULL DEFAULT 'local',
    file_path TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    album TEXT NOT NULL,
    album_artist TEXT NOT NULL,
    genre TEXT NOT NULL,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    track_number INTEGER,
    disc_number INTEGER,
    release_year INTEGER,
    format TEXT NOT NULL,
    bitrate_kbps INTEGER,
    sample_rate_hz INTEGER,
    artwork_path TEXT,
    file_size INTEGER NOT NULL DEFAULT 0,
    modified_at INTEGER NOT NULL DEFAULT 0,
    is_missing INTEGER NOT NULL DEFAULT 0,
    play_count INTEGER NOT NULL DEFAULT 0,
    last_played_at INTEGER,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    added_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist);
CREATE INDEX IF NOT EXISTS idx_tracks_album ON tracks(album);
CREATE INDEX IF NOT EXISTS idx_tracks_genre ON tracks(genre);
CREATE INDEX IF NOT EXISTS idx_tracks_favorite ON tracks(is_favorite);
CREATE INDEX IF NOT EXISTS idx_tracks_last_played ON tracks(last_played_at);

CREATE VIRTUAL TABLE IF NOT EXISTS tracks_fts USING fts5(
    title,
    artist,
    album,
    genre,
    content='tracks',
    content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS tracks_ai AFTER INSERT ON tracks BEGIN
    INSERT INTO tracks_fts(rowid, title, artist, album, genre)
    VALUES (new.id, new.title, new.artist, new.album, new.genre);
END;

CREATE TRIGGER IF NOT EXISTS tracks_ad AFTER DELETE ON tracks BEGIN
    INSERT INTO tracks_fts(tracks_fts, rowid, title, artist, album, genre)
    VALUES ('delete', old.id, old.title, old.artist, old.album, old.genre);
END;

CREATE TRIGGER IF NOT EXISTS tracks_au AFTER UPDATE ON tracks BEGIN
    INSERT INTO tracks_fts(tracks_fts, rowid, title, artist, album, genre)
    VALUES ('delete', old.id, old.title, old.artist, old.album, old.genre);
    INSERT INTO tracks_fts(rowid, title, artist, album, genre)
    VALUES (new.id, new.title, new.artist, new.album, new.genre);
END;

CREATE TABLE IF NOT EXISTS playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS playlist_tracks (
    playlist_id INTEGER NOT NULL,
    track_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    added_at INTEGER NOT NULL,
    PRIMARY KEY (playlist_id, track_id),
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
    FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS playback_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    track_id INTEGER NOT NULL,
    played_at INTEGER NOT NULL,
    FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS playback_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    current_track_id INTEGER,
    position_ms INTEGER NOT NULL DEFAULT 0,
    volume REAL NOT NULL DEFAULT 0.8,
    muted INTEGER NOT NULL DEFAULT 0,
    shuffle INTEGER NOT NULL DEFAULT 0,
    repeat_mode TEXT NOT NULL DEFAULT 'off',
    queue_track_ids TEXT NOT NULL DEFAULT '[]',
    queue_index INTEGER NOT NULL DEFAULT -1
);

INSERT OR IGNORE INTO playback_state (id) VALUES (1);
"#;

const MIGRATION_V2: &str = r#"
CREATE TABLE IF NOT EXISTS smart_playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    match_mode TEXT NOT NULL DEFAULT 'all',
    rules_json TEXT NOT NULL DEFAULT '[]',
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS collection_tracks (
    collection_id INTEGER NOT NULL,
    track_id INTEGER NOT NULL,
    added_at INTEGER NOT NULL,
    PRIMARY KEY (collection_id, track_id),
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
    FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS track_identity_links (
    track_a_id INTEGER NOT NULL,
    track_b_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'suggested',
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (track_a_id, track_b_id),
    FOREIGN KEY (track_a_id) REFERENCES tracks(id) ON DELETE CASCADE,
    FOREIGN KEY (track_b_id) REFERENCES tracks(id) ON DELETE CASCADE
);

INSERT INTO smart_playlists (name, match_mode, rules_json, created_at)
VALUES
    ('Favorites', 'all', '[{"field":"favorite","operator":"is_true","value":""}]', 0),
    ('Most Played', 'all', '[{"field":"play_count","operator":"gte","value":"3"}]', 0),
    ('Never Played', 'all', '[{"field":"play_count","operator":"equals","value":"0"}]', 0);
"#;

const MIGRATION_V3: &str = r#"
CREATE TABLE IF NOT EXISTS provider_settings (
    provider_id TEXT PRIMARY KEY,
    enabled INTEGER NOT NULL DEFAULT 1,
    updated_at INTEGER NOT NULL
);
"#;

const MIGRATION_V4: &str = r#"
CREATE TABLE IF NOT EXISTS downloads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_id TEXT NOT NULL,
    external_id TEXT NOT NULL,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    album TEXT NOT NULL,
    license TEXT,
    artwork_url TEXT,
    source_url TEXT,
    target_path TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    bytes_downloaded INTEGER NOT NULL DEFAULT 0,
    total_bytes INTEGER,
    error_message TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS download_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    download_dir TEXT NOT NULL DEFAULT '',
    max_concurrent INTEGER NOT NULL DEFAULT 2,
    naming_template TEXT NOT NULL DEFAULT '{artist} - {title}',
    auto_tag INTEGER NOT NULL DEFAULT 1,
    auto_add_to_library INTEGER NOT NULL DEFAULT 1
);

INSERT OR IGNORE INTO download_settings (id) VALUES (1);

CREATE TABLE IF NOT EXISTS cache_entries (
    cache_key TEXT PRIMARY KEY,
    provider_id TEXT NOT NULL,
    external_id TEXT NOT NULL,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    file_path TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    last_accessed_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cache_entries_accessed ON cache_entries(last_accessed_at);
CREATE INDEX IF NOT EXISTS idx_cache_entries_expires ON cache_entries(expires_at);

CREATE TABLE IF NOT EXISTS cache_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    enabled INTEGER NOT NULL DEFAULT 1,
    max_size_mb INTEGER NOT NULL DEFAULT 512,
    ttl_hours INTEGER NOT NULL DEFAULT 72,
    offline_mode INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO cache_settings (id) VALUES (1);
"#;

pub fn apply_migrations(conn: &Connection) -> Result<(), AppError> {
    conn.execute_batch("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;")?;
    let current_version: i64 = conn.query_row("PRAGMA user_version;", [], |row| row.get(0))?;

    if current_version < 1 {
        let tx = conn.unchecked_transaction()?;
        tx.execute_batch(MIGRATION_V1)?;
        tx.pragma_update(None, "user_version", 1i64)?;
        tx.commit()?;
    }

    if current_version < 2 {
        let tx = conn.unchecked_transaction()?;
        tx.execute_batch(MIGRATION_V2)?;
        tx.pragma_update(None, "user_version", 2i64)?;
        tx.commit()?;
    }

    if current_version < 3 {
        let tx = conn.unchecked_transaction()?;
        tx.execute_batch(MIGRATION_V3)?;
        tx.pragma_update(None, "user_version", 3i64)?;
        tx.commit()?;
    }

    if current_version < 4 {
        let tx = conn.unchecked_transaction()?;
        tx.execute_batch(MIGRATION_V4)?;
        tx.pragma_update(None, "user_version", 4i64)?;
        tx.commit()?;
    }

    Ok(())
}
