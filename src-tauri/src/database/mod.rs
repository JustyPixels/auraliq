pub mod migrations;
pub mod models;

use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::{params, Connection, OptionalExtension, Row};

use crate::error::AppError;
use crate::metadata::identity::{
    evaluate_smart_playlist, find_duplicate_groups, suggest_identity_links,
};
use models::{
    AlbumSummary, ArtistSummary, CollectionRecord, DuplicateGroup, GenreSummary, LibraryFolder,
    NewTrackData, PlaybackStateRecord, PlaylistRecord, SearchFilters, SmartPlaylistRecord,
    SmartPlaylistRule, TrackIdentityLink, TrackRecord,
};

pub struct Database {
    conn: Connection,
}

pub fn now_unix_secs() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

fn row_to_track(row: &Row<'_>) -> rusqlite::Result<TrackRecord> {
    Ok(TrackRecord {
        id: row.get(0)?,
        source_provider: row.get(1)?,
        file_path: row.get(2)?,
        title: row.get(3)?,
        artist: row.get(4)?,
        album: row.get(5)?,
        album_artist: row.get(6)?,
        genre: row.get(7)?,
        duration_ms: row.get(8)?,
        track_number: row.get(9)?,
        disc_number: row.get(10)?,
        release_year: row.get(11)?,
        format: row.get(12)?,
        bitrate_kbps: row.get(13)?,
        sample_rate_hz: row.get(14)?,
        artwork_path: row.get(15)?,
        file_size: row.get(16)?,
        modified_at: row.get(17)?,
        is_missing: row.get::<_, i64>(18)? != 0,
        play_count: row.get(19)?,
        last_played_at: row.get(20)?,
        is_favorite: row.get::<_, i64>(21)? != 0,
        added_at: row.get(22)?,
    })
}

const TRACK_COLUMNS: &str = "id, source_provider, file_path, title, artist, album, album_artist, genre, duration_ms, track_number, disc_number, release_year, format, bitrate_kbps, sample_rate_hz, artwork_path, file_size, modified_at, is_missing, play_count, last_played_at, is_favorite, added_at";

impl Database {
    pub fn open(path: &Path) -> Result<Self, AppError> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let conn = Connection::open(path)?;
        migrations::apply_migrations(&conn)?;
        Ok(Self { conn })
    }

    pub fn open_in_memory() -> Result<Self, AppError> {
        let conn = Connection::open_in_memory()?;
        migrations::apply_migrations(&conn)?;
        Ok(Self { conn })
    }

    pub fn list_folders(&self) -> Result<Vec<LibraryFolder>, AppError> {
        let mut stmt = self.conn.prepare(
            "SELECT id, path, added_at, last_scanned_at FROM library_folders ORDER BY added_at ASC",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(LibraryFolder {
                id: row.get(0)?,
                path: row.get(1)?,
                added_at: row.get(2)?,
                last_scanned_at: row.get(3)?,
            })
        })?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }

    pub fn add_folder(&self, path: &str) -> Result<LibraryFolder, AppError> {
        let now = now_unix_secs();
        self.conn.execute(
            "INSERT OR IGNORE INTO library_folders (path, added_at) VALUES (?1, ?2)",
            params![path, now],
        )?;
        let folder = self.conn.query_row(
            "SELECT id, path, added_at, last_scanned_at FROM library_folders WHERE path = ?1",
            params![path],
            |row| {
                Ok(LibraryFolder {
                    id: row.get(0)?,
                    path: row.get(1)?,
                    added_at: row.get(2)?,
                    last_scanned_at: row.get(3)?,
                })
            },
        )?;
        Ok(folder)
    }

    pub fn remove_folder(&self, folder_id: i64) -> Result<(), AppError> {
        let folder_path: Option<String> = self
            .conn
            .query_row(
                "SELECT path FROM library_folders WHERE id = ?1",
                params![folder_id],
                |row| row.get(0),
            )
            .optional()?;

        if let Some(path) = folder_path {
            let like_pattern = format!("{path}%");
            self.conn.execute(
                "DELETE FROM tracks WHERE file_path LIKE ?1",
                params![like_pattern],
            )?;
            self.conn.execute(
                "DELETE FROM library_folders WHERE id = ?1",
                params![folder_id],
            )?;
        }
        Ok(())
    }

    pub fn touch_folder_scanned(&self, folder_id: i64) -> Result<(), AppError> {
        let now = now_unix_secs();
        self.conn.execute(
            "UPDATE library_folders SET last_scanned_at = ?1 WHERE id = ?2",
            params![now, folder_id],
        )?;
        Ok(())
    }

    pub fn get_track_by_path_meta(
        &self,
        file_path: &str,
    ) -> Result<Option<(i64, i64, i64, bool)>, AppError> {
        let res = self
            .conn
            .query_row(
                "SELECT id, file_size, modified_at, is_missing FROM tracks WHERE file_path = ?1",
                params![file_path],
                |row| {
                    Ok((
                        row.get::<_, i64>(0)?,
                        row.get::<_, i64>(1)?,
                        row.get::<_, i64>(2)?,
                        row.get::<_, i64>(3)? != 0,
                    ))
                },
            )
            .optional()?;
        Ok(res)
    }

    pub fn upsert_track(&self, data: &NewTrackData) -> Result<bool, AppError> {
        let existing = self.get_track_by_path_meta(&data.file_path)?;
        if existing.is_some() {
            self.conn.execute(
                "UPDATE tracks SET title = ?1, artist = ?2, album = ?3, album_artist = ?4, genre = ?5,
                 duration_ms = ?6, track_number = ?7, disc_number = ?8, release_year = ?9, format = ?10,
                 bitrate_kbps = ?11, sample_rate_hz = ?12, artwork_path = ?13, file_size = ?14,
                 modified_at = ?15, is_missing = 0
                 WHERE file_path = ?16",
                params![
                    data.title,
                    data.artist,
                    data.album,
                    data.album_artist,
                    data.genre,
                    data.duration_ms,
                    data.track_number,
                    data.disc_number,
                    data.release_year,
                    data.format,
                    data.bitrate_kbps,
                    data.sample_rate_hz,
                    data.artwork_path,
                    data.file_size,
                    data.modified_at,
                    data.file_path,
                ],
            )?;
            Ok(false)
        } else {
            let now = now_unix_secs();
            self.conn.execute(
                "INSERT INTO tracks (
                    source_provider, file_path, title, artist, album, album_artist, genre,
                    duration_ms, track_number, disc_number, release_year, format,
                    bitrate_kbps, sample_rate_hz, artwork_path, file_size, modified_at, is_missing, added_at
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, 0, ?18)",
                params![
                    data.source_provider,
                    data.file_path,
                    data.title,
                    data.artist,
                    data.album,
                    data.album_artist,
                    data.genre,
                    data.duration_ms,
                    data.track_number,
                    data.disc_number,
                    data.release_year,
                    data.format,
                    data.bitrate_kbps,
                    data.sample_rate_hz,
                    data.artwork_path,
                    data.file_size,
                    data.modified_at,
                    now,
                ],
            )?;
            Ok(true)
        }
    }

    pub fn mark_missing_under_folder(
        &self,
        folder_prefix: &str,
        seen_paths: &std::collections::HashSet<String>,
    ) -> Result<usize, AppError> {
        let like_pattern = format!("{folder_prefix}%");
        let mut stmt = self.conn.prepare(
            "SELECT id, file_path FROM tracks WHERE file_path LIKE ?1 AND is_missing = 0",
        )?;
        let rows = stmt
            .query_map(params![like_pattern], |row| {
                Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?))
            })?
            .collect::<Result<Vec<_>, _>>()?;

        let mut missing_count = 0usize;
        for (id, path) in rows {
            if !seen_paths.contains(&path) {
                self.conn.execute(
                    "UPDATE tracks SET is_missing = 1 WHERE id = ?1",
                    params![id],
                )?;
                missing_count += 1;
            }
        }
        Ok(missing_count)
    }

    pub fn list_tracks(
        &self,
        favorites_only: bool,
        sort_by: Option<&str>,
    ) -> Result<Vec<TrackRecord>, AppError> {
        let order_clause = match sort_by {
            Some("artist") => {
                "ORDER BY LOWER(artist) ASC, LOWER(album) ASC, track_number ASC, LOWER(title) ASC"
            }
            Some("recent") => "ORDER BY added_at DESC, id DESC",
            _ => "ORDER BY LOWER(title) ASC, id ASC",
        };
        let where_clause = if favorites_only {
            "WHERE is_missing = 0 AND is_favorite = 1"
        } else {
            "WHERE is_missing = 0"
        };
        let sql = format!("SELECT {TRACK_COLUMNS} FROM tracks {where_clause} {order_clause}");
        let mut stmt = self.conn.prepare(&sql)?;
        let rows = stmt.query_map([], row_to_track)?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }

    pub fn search_tracks(&self, query: &str) -> Result<Vec<TrackRecord>, AppError> {
        let trimmed = query.trim();
        if trimmed.is_empty() {
            return self.list_tracks(false, Some("title"));
        }

        let tokens: Vec<String> = trimmed
            .split_whitespace()
            .map(|t| {
                t.chars()
                    .filter(|c| c.is_alphanumeric() || *c == '_' || *c == '-')
                    .collect::<String>()
            })
            .filter(|t| !t.is_empty())
            .map(|t| format!("\"{t}\"*"))
            .collect();

        if !tokens.is_empty() {
            let fts_query = tokens.join(" ");
            let sql = "SELECT t.id, t.source_provider, t.file_path, t.title, t.artist, t.album, t.album_artist, t.genre,
                        t.duration_ms, t.track_number, t.disc_number, t.release_year, t.format, t.bitrate_kbps,
                        t.sample_rate_hz, t.artwork_path, t.file_size, t.modified_at, t.is_missing, t.play_count,
                        t.last_played_at, t.is_favorite, t.added_at
                 FROM tracks t
                 JOIN tracks_fts f ON t.id = f.rowid
                 WHERE tracks_fts MATCH ?1 AND t.is_missing = 0
                 ORDER BY rank LIMIT 200";
            if let Ok(mut stmt) = self.conn.prepare(sql) {
                if let Ok(rows) = stmt.query_map(params![fts_query], row_to_track) {
                    let collected = rows.collect::<Result<Vec<_>, _>>()?;
                    if !collected.is_empty() {
                        return Ok(collected);
                    }
                }
            }
        }

        let pattern = format!("%{trimmed}%");
        let sql = format!(
            "SELECT {TRACK_COLUMNS} FROM tracks
             WHERE is_missing = 0 AND (title LIKE ?1 OR artist LIKE ?1 OR album LIKE ?1 OR genre LIKE ?1)
             ORDER BY LOWER(title) ASC LIMIT 200"
        );
        let mut stmt = self.conn.prepare(&sql)?;
        let rows = stmt.query_map(params![pattern], row_to_track)?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }

    pub fn get_track(&self, track_id: i64) -> Result<Option<TrackRecord>, AppError> {
        let sql = format!("SELECT {TRACK_COLUMNS} FROM tracks WHERE id = ?1");
        let row = self
            .conn
            .query_row(&sql, params![track_id], row_to_track)
            .optional()?;
        Ok(row)
    }

    pub fn find_track_id_by_path(&self, file_path: &str) -> Result<Option<i64>, AppError> {
        let id = self
            .conn
            .query_row(
                "SELECT id FROM tracks WHERE file_path = ?1",
                params![file_path],
                |row| row.get(0),
            )
            .optional()?;
        Ok(id)
    }

    pub fn list_artists(&self) -> Result<Vec<ArtistSummary>, AppError> {
        let mut stmt = self.conn.prepare(
            "SELECT artist, COUNT(*), COUNT(DISTINCT album)
             FROM tracks WHERE is_missing = 0
             GROUP BY artist ORDER BY LOWER(artist) ASC",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(ArtistSummary {
                name: row.get(0)?,
                track_count: row.get(1)?,
                album_count: row.get(2)?,
            })
        })?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }

    pub fn list_albums(&self) -> Result<Vec<AlbumSummary>, AppError> {
        let mut stmt = self.conn.prepare(
            "SELECT album, MIN(album_artist), MAX(release_year), COUNT(*), MAX(artwork_path)
             FROM tracks WHERE is_missing = 0
             GROUP BY album ORDER BY LOWER(album) ASC",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(AlbumSummary {
                name: row.get(0)?,
                artist: row.get(1)?,
                release_year: row.get(2)?,
                track_count: row.get(3)?,
                artwork_path: row.get(4)?,
            })
        })?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }

    pub fn list_genres(&self) -> Result<Vec<GenreSummary>, AppError> {
        let mut stmt = self.conn.prepare(
            "SELECT genre, COUNT(*)
             FROM tracks WHERE is_missing = 0
             GROUP BY genre ORDER BY COUNT(*) DESC, LOWER(genre) ASC",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(GenreSummary {
                name: row.get(0)?,
                track_count: row.get(1)?,
            })
        })?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }

    pub fn toggle_favorite(&self, track_id: i64) -> Result<bool, AppError> {
        let current: i64 = self
            .conn
            .query_row(
                "SELECT is_favorite FROM tracks WHERE id = ?1",
                params![track_id],
                |row| row.get(0),
            )
            .optional()?
            .ok_or_else(|| AppError::NotFound(format!("track {track_id}")))?;
        let next = if current == 0 { 1i64 } else { 0i64 };
        self.conn.execute(
            "UPDATE tracks SET is_favorite = ?1 WHERE id = ?2",
            params![next, track_id],
        )?;
        Ok(next != 0)
    }

    pub fn record_play(&self, track_id: i64) -> Result<(), AppError> {
        let now = now_unix_secs();
        self.conn.execute(
            "UPDATE tracks SET play_count = play_count + 1, last_played_at = ?1 WHERE id = ?2",
            params![now, track_id],
        )?;
        self.conn.execute(
            "INSERT INTO playback_history (track_id, played_at) VALUES (?1, ?2)",
            params![track_id, now],
        )?;
        Ok(())
    }

    pub fn list_recently_played(&self, limit: usize) -> Result<Vec<TrackRecord>, AppError> {
        let sql = format!(
            "SELECT {TRACK_COLUMNS} FROM tracks
             WHERE is_missing = 0 AND last_played_at IS NOT NULL
             ORDER BY last_played_at DESC, id DESC LIMIT ?1"
        );
        let mut stmt = self.conn.prepare(&sql)?;
        let rows = stmt.query_map(params![limit as i64], row_to_track)?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }

    pub fn list_playlists(&self) -> Result<Vec<PlaylistRecord>, AppError> {
        let mut stmt = self.conn.prepare(
            "SELECT p.id, p.name, p.description, COUNT(pt.track_id), p.created_at, p.updated_at
             FROM playlists p
             LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id
             GROUP BY p.id
             ORDER BY p.updated_at DESC, p.id DESC",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(PlaylistRecord {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                track_count: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }

    pub fn create_playlist(
        &self,
        name: &str,
        description: &str,
    ) -> Result<PlaylistRecord, AppError> {
        let now = now_unix_secs();
        self.conn.execute(
            "INSERT INTO playlists (name, description, created_at, updated_at) VALUES (?1, ?2, ?3, ?3)",
            params![name.trim(), description.trim(), now],
        )?;
        let id = self.conn.last_insert_rowid();
        Ok(PlaylistRecord {
            id,
            name: name.trim().to_string(),
            description: description.trim().to_string(),
            track_count: 0,
            created_at: now,
            updated_at: now,
        })
    }

    pub fn rename_playlist(&self, playlist_id: i64, name: &str) -> Result<(), AppError> {
        let now = now_unix_secs();
        self.conn.execute(
            "UPDATE playlists SET name = ?1, updated_at = ?2 WHERE id = ?3",
            params![name.trim(), now, playlist_id],
        )?;
        Ok(())
    }

    pub fn delete_playlist(&self, playlist_id: i64) -> Result<(), AppError> {
        self.conn
            .execute("DELETE FROM playlists WHERE id = ?1", params![playlist_id])?;
        Ok(())
    }

    pub fn get_playlist_tracks(&self, playlist_id: i64) -> Result<Vec<TrackRecord>, AppError> {
        let sql = "SELECT t.id, t.source_provider, t.file_path, t.title, t.artist, t.album, t.album_artist, t.genre,
                    t.duration_ms, t.track_number, t.disc_number, t.release_year, t.format, t.bitrate_kbps,
                    t.sample_rate_hz, t.artwork_path, t.file_size, t.modified_at, t.is_missing, t.play_count,
                    t.last_played_at, t.is_favorite, t.added_at
             FROM tracks t
             JOIN playlist_tracks pt ON t.id = pt.track_id
             WHERE pt.playlist_id = ?1
             ORDER BY pt.position ASC, pt.added_at ASC";
        let mut stmt = self.conn.prepare(sql)?;
        let rows = stmt.query_map(params![playlist_id], row_to_track)?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }

    pub fn add_track_to_playlist(&self, playlist_id: i64, track_id: i64) -> Result<(), AppError> {
        let now = now_unix_secs();
        let next_pos: i64 = self.conn.query_row(
            "SELECT COALESCE(MAX(position), -1) + 1 FROM playlist_tracks WHERE playlist_id = ?1",
            params![playlist_id],
            |row| row.get(0),
        )?;
        self.conn.execute(
            "INSERT OR IGNORE INTO playlist_tracks (playlist_id, track_id, position, added_at)
             VALUES (?1, ?2, ?3, ?4)",
            params![playlist_id, track_id, next_pos, now],
        )?;
        self.conn.execute(
            "UPDATE playlists SET updated_at = ?1 WHERE id = ?2",
            params![now, playlist_id],
        )?;
        Ok(())
    }

    pub fn remove_track_from_playlist(
        &self,
        playlist_id: i64,
        track_id: i64,
    ) -> Result<(), AppError> {
        let now = now_unix_secs();
        self.conn.execute(
            "DELETE FROM playlist_tracks WHERE playlist_id = ?1 AND track_id = ?2",
            params![playlist_id, track_id],
        )?;
        self.conn.execute(
            "UPDATE playlists SET updated_at = ?1 WHERE id = ?2",
            params![now, playlist_id],
        )?;
        Ok(())
    }

    pub fn load_playback_state(&self) -> Result<PlaybackStateRecord, AppError> {
        self.conn
            .query_row(
                "SELECT current_track_id, position_ms, volume, muted, shuffle, repeat_mode, queue_track_ids, queue_index
                 FROM playback_state WHERE id = 1",
                [],
                |row| {
                    let raw_queue: String = row.get(6)?;
                    let queue_track_ids: Vec<i64> =
                        serde_json::from_str(&raw_queue).unwrap_or_default();
                    Ok(PlaybackStateRecord {
                        current_track_id: row.get(0)?,
                        position_ms: row.get(1)?,
                        volume: row.get(2)?,
                        muted: row.get::<_, i64>(3)? != 0,
                        shuffle: row.get::<_, i64>(4)? != 0,
                        repeat_mode: row.get(5)?,
                        queue_track_ids,
                        queue_index: row.get(7)?,
                    })
                },
            )
            .map_err(AppError::from)
    }

    pub fn save_playback_state(&self, state: &PlaybackStateRecord) -> Result<(), AppError> {
        let queue_json = serde_json::to_string(&state.queue_track_ids)
            .map_err(|e| AppError::Internal(e.to_string()))?;
        self.conn.execute(
            "UPDATE playback_state SET
                current_track_id = ?1,
                position_ms = ?2,
                volume = ?3,
                muted = ?4,
                shuffle = ?5,
                repeat_mode = ?6,
                queue_track_ids = ?7,
                queue_index = ?8
             WHERE id = 1",
            params![
                state.current_track_id,
                state.position_ms,
                state.volume,
                i64::from(state.muted),
                i64::from(state.shuffle),
                state.repeat_mode,
                queue_json,
                state.queue_index,
            ],
        )?;
        Ok(())
    }

    pub fn search_tracks_filtered(
        &self,
        filters: &SearchFilters,
    ) -> Result<Vec<TrackRecord>, AppError> {
        let base = if filters.query.trim().is_empty() {
            self.list_tracks(false, Some("title"))?
        } else {
            self.search_tracks(&filters.query)?
        };

        let filtered = base
            .into_iter()
            .filter(|t| {
                if let Some(ref src) = filters.source {
                    if !src.is_empty()
                        && src != "all"
                        && !t.source_provider.eq_ignore_ascii_case(src)
                    {
                        return false;
                    }
                }
                if let Some(ref genre) = filters.genre {
                    if !genre.is_empty() && !t.genre.eq_ignore_ascii_case(genre) {
                        return false;
                    }
                }
                if let Some(ref artist) = filters.artist {
                    if !artist.is_empty()
                        && !t
                            .artist
                            .to_ascii_lowercase()
                            .contains(&artist.to_ascii_lowercase())
                    {
                        return false;
                    }
                }
                let secs = t.duration_ms / 1000;
                if let Some(min_s) = filters.min_duration_sec {
                    if secs < min_s {
                        return false;
                    }
                }
                if let Some(max_s) = filters.max_duration_sec {
                    if secs > max_s {
                        return false;
                    }
                }
                !filters.favorites_only.unwrap_or(false) || t.is_favorite
            })
            .collect();

        Ok(filtered)
    }

    pub fn list_smart_playlists(&self) -> Result<Vec<SmartPlaylistRecord>, AppError> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, match_mode, rules_json, created_at FROM smart_playlists ORDER BY id ASC",
        )?;
        let rows = stmt.query_map([], |row| {
            let raw_rules: String = row.get(3)?;
            let rules: Vec<SmartPlaylistRule> =
                serde_json::from_str(&raw_rules).unwrap_or_default();
            Ok(SmartPlaylistRecord {
                id: row.get(0)?,
                name: row.get(1)?,
                match_mode: row.get(2)?,
                rules,
                created_at: row.get(4)?,
            })
        })?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }

    pub fn create_smart_playlist(
        &self,
        name: &str,
        match_mode: &str,
        rules: &[SmartPlaylistRule],
    ) -> Result<SmartPlaylistRecord, AppError> {
        let now = now_unix_secs();
        let mode = if match_mode == "any" { "any" } else { "all" };
        let rules_json =
            serde_json::to_string(rules).map_err(|e| AppError::Internal(e.to_string()))?;
        self.conn.execute(
            "INSERT INTO smart_playlists (name, match_mode, rules_json, created_at) VALUES (?1, ?2, ?3, ?4)",
            params![name.trim(), mode, rules_json, now],
        )?;
        Ok(SmartPlaylistRecord {
            id: self.conn.last_insert_rowid(),
            name: name.trim().to_string(),
            match_mode: mode.to_string(),
            rules: rules.to_vec(),
            created_at: now,
        })
    }

    pub fn delete_smart_playlist(&self, smart_id: i64) -> Result<(), AppError> {
        self.conn.execute(
            "DELETE FROM smart_playlists WHERE id = ?1",
            params![smart_id],
        )?;
        Ok(())
    }

    pub fn get_smart_playlist_tracks(&self, smart_id: i64) -> Result<Vec<TrackRecord>, AppError> {
        let (match_mode, raw_rules): (String, String) = self
            .conn
            .query_row(
                "SELECT match_mode, rules_json FROM smart_playlists WHERE id = ?1",
                params![smart_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .optional()?
            .ok_or_else(|| AppError::NotFound(format!("smart playlist {smart_id}")))?;
        let rules: Vec<SmartPlaylistRule> = serde_json::from_str(&raw_rules).unwrap_or_default();
        let all_tracks = self.list_tracks(false, Some("title"))?;
        Ok(evaluate_smart_playlist(&all_tracks, &rules, &match_mode))
    }

    pub fn list_collections(&self) -> Result<Vec<CollectionRecord>, AppError> {
        let mut stmt = self.conn.prepare(
            "SELECT c.id, c.name, c.description, COUNT(ct.track_id), c.created_at
             FROM collections c
             LEFT JOIN collection_tracks ct ON c.id = ct.collection_id
             GROUP BY c.id
             ORDER BY c.created_at DESC, c.id DESC",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(CollectionRecord {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                track_count: row.get(3)?,
                created_at: row.get(4)?,
            })
        })?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }

    pub fn create_collection(
        &self,
        name: &str,
        description: &str,
    ) -> Result<CollectionRecord, AppError> {
        let now = now_unix_secs();
        self.conn.execute(
            "INSERT INTO collections (name, description, created_at) VALUES (?1, ?2, ?3)",
            params![name.trim(), description.trim(), now],
        )?;
        Ok(CollectionRecord {
            id: self.conn.last_insert_rowid(),
            name: name.trim().to_string(),
            description: description.trim().to_string(),
            track_count: 0,
            created_at: now,
        })
    }

    pub fn delete_collection(&self, collection_id: i64) -> Result<(), AppError> {
        self.conn.execute(
            "DELETE FROM collections WHERE id = ?1",
            params![collection_id],
        )?;
        Ok(())
    }

    pub fn get_collection_tracks(&self, collection_id: i64) -> Result<Vec<TrackRecord>, AppError> {
        let sql = "SELECT t.id, t.source_provider, t.file_path, t.title, t.artist, t.album, t.album_artist, t.genre,
                    t.duration_ms, t.track_number, t.disc_number, t.release_year, t.format, t.bitrate_kbps,
                    t.sample_rate_hz, t.artwork_path, t.file_size, t.modified_at, t.is_missing, t.play_count,
                    t.last_played_at, t.is_favorite, t.added_at
             FROM tracks t
             JOIN collection_tracks ct ON t.id = ct.track_id
             WHERE ct.collection_id = ?1
             ORDER BY ct.added_at DESC";
        let mut stmt = self.conn.prepare(sql)?;
        let rows = stmt.query_map(params![collection_id], row_to_track)?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }

    pub fn add_track_to_collection(
        &self,
        collection_id: i64,
        track_id: i64,
    ) -> Result<(), AppError> {
        let now = now_unix_secs();
        self.conn.execute(
            "INSERT OR IGNORE INTO collection_tracks (collection_id, track_id, added_at) VALUES (?1, ?2, ?3)",
            params![collection_id, track_id, now],
        )?;
        Ok(())
    }

    pub fn remove_track_from_collection(
        &self,
        collection_id: i64,
        track_id: i64,
    ) -> Result<(), AppError> {
        self.conn.execute(
            "DELETE FROM collection_tracks WHERE collection_id = ?1 AND track_id = ?2",
            params![collection_id, track_id],
        )?;
        Ok(())
    }

    pub fn find_duplicate_tracks(&self) -> Result<Vec<DuplicateGroup>, AppError> {
        let tracks = self.list_tracks(false, Some("title"))?;
        Ok(find_duplicate_groups(&tracks))
    }

    pub fn list_identity_links(&self) -> Result<Vec<TrackIdentityLink>, AppError> {
        let tracks = self.list_tracks(false, Some("title"))?;
        let mut stmt = self
            .conn
            .prepare("SELECT track_a_id, track_b_id, status FROM track_identity_links")?;
        let rows = stmt.query_map([], |row| {
            Ok((
                (row.get::<_, i64>(0)?, row.get::<_, i64>(1)?),
                row.get::<_, String>(2)?,
            ))
        })?;
        let mut statuses = std::collections::HashMap::new();
        for row in rows {
            let (pair, status) = row?;
            statuses.insert(pair, status);
        }
        Ok(suggest_identity_links(&tracks, &statuses))
    }

    pub fn set_identity_link_status(
        &self,
        track_a_id: i64,
        track_b_id: i64,
        status: &str,
    ) -> Result<(), AppError> {
        let (a, b) = if track_a_id < track_b_id {
            (track_a_id, track_b_id)
        } else {
            (track_b_id, track_a_id)
        };
        let clean_status = if status == "confirmed" {
            "confirmed"
        } else {
            "dismissed"
        };
        let now = now_unix_secs();
        self.conn.execute(
            "INSERT INTO track_identity_links (track_a_id, track_b_id, status, updated_at)
             VALUES (?1, ?2, ?3, ?4)
             ON CONFLICT(track_a_id, track_b_id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at",
            params![a, b, clean_status, now],
        )?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    fn sample_track(path: &str, title: &str) -> NewTrackData {
        NewTrackData {
            source_provider: "local".to_string(),
            file_path: path.to_string(),
            title: title.to_string(),
            artist: "Retro Synth".to_string(),
            album: "Night Signals".to_string(),
            album_artist: "Retro Synth".to_string(),
            genre: "Synthwave".to_string(),
            duration_ms: 180_000,
            track_number: Some(1),
            disc_number: Some(1),
            release_year: Some(2024),
            format: "flac".to_string(),
            bitrate_kbps: Some(900),
            sample_rate_hz: Some(44100),
            artwork_path: None,
            file_size: 1024,
            modified_at: 100,
        }
    }

    #[test]
    fn crud_fts_playlists_and_playback_state() {
        let db = Database::open_in_memory().expect("in-memory db");
        let folder = db.add_folder("E:\\Music").expect("add folder");
        assert_eq!(db.list_folders().unwrap().len(), 1);

        let inserted = db
            .upsert_track(&sample_track("E:\\Music\\neon.flac", "Neon Horizon"))
            .expect("upsert");
        assert!(inserted);

        let hits = db.search_tracks("Neon").expect("fts search");
        assert_eq!(hits.len(), 1);
        let track_id = hits[0].id;

        assert!(db.toggle_favorite(track_id).unwrap());
        assert_eq!(db.list_tracks(true, None).unwrap().len(), 1);

        db.record_play(track_id).unwrap();
        assert_eq!(db.list_recently_played(10).unwrap()[0].play_count, 1);

        let pl = db.create_playlist("Late Night", "Synth").unwrap();
        db.add_track_to_playlist(pl.id, track_id).unwrap();
        assert_eq!(db.get_playlist_tracks(pl.id).unwrap().len(), 1);

        let state = PlaybackStateRecord {
            current_track_id: Some(track_id),
            position_ms: 42_000,
            volume: 0.65,
            muted: false,
            shuffle: true,
            repeat_mode: "all".to_string(),
            queue_track_ids: vec![track_id],
            queue_index: 0,
        };
        db.save_playback_state(&state).unwrap();
        let loaded = db.load_playback_state().unwrap();
        assert_eq!(loaded.position_ms, 42_000);
        assert!(loaded.shuffle);
        assert_eq!(loaded.queue_track_ids, vec![track_id]);

        let missing = db
            .mark_missing_under_folder("E:\\Music", &HashSet::new())
            .unwrap();
        assert_eq!(missing, 1);
        assert_eq!(db.list_tracks(false, None).unwrap().len(), 0);

        db.remove_folder(folder.id).unwrap();
        assert_eq!(db.list_folders().unwrap().len(), 0);
    }

    #[test]
    fn migration_v2_smart_playlists_collections_and_identity_links() {
        let db = Database::open_in_memory().unwrap();
        let smart = db.list_smart_playlists().unwrap();
        assert!(smart.len() >= 3);

        db.upsert_track(&sample_track("E:\\Music\\a.flac", "Neon Horizon"))
            .unwrap();
        db.upsert_track(&sample_track("E:\\Music\\b.mp3", "Neon Horizon"))
            .unwrap();

        let filtered = db
            .search_tracks_filtered(&SearchFilters {
                query: "Neon".into(),
                source: Some("local".into()),
                genre: Some("Synthwave".into()),
                ..Default::default()
            })
            .unwrap();
        assert_eq!(filtered.len(), 2);

        let col = db.create_collection("Night Drive", "Favs").unwrap();
        db.add_track_to_collection(col.id, filtered[0].id).unwrap();
        assert_eq!(db.get_collection_tracks(col.id).unwrap().len(), 1);

        let dups = db.find_duplicate_tracks().unwrap();
        assert_eq!(dups.len(), 1);

        db.set_identity_link_status(filtered[0].id, filtered[1].id, "confirmed")
            .unwrap();
        let links = db.list_identity_links().unwrap();
        assert_eq!(links[0].status, "confirmed");
    }
}
