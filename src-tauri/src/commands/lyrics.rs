use std::path::Path;

use tauri::State;

use crate::database::models::{CachedLyricsRecord, LyricsSettingsRecord};
use crate::database::now_unix_secs;
use crate::error::AppError;
use crate::lyrics::{
    fetch_lrclib_lyrics, load_sidecar_lrc, lyrics_cache_key, parse_synced_lrc, LyricsResult,
};
use crate::AppState;

#[tauri::command]
pub fn get_lyrics_settings(state: State<'_, AppState>) -> Result<LyricsSettingsRecord, AppError> {
    let db = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
    db.get_lyrics_settings()
}

#[tauri::command]
pub fn set_lrclib_enabled(
    enabled: bool,
    state: State<'_, AppState>,
) -> Result<LyricsSettingsRecord, AppError> {
    let db = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
    db.set_lrclib_enabled(enabled)
}

#[tauri::command]
pub fn clear_lyrics_cache(state: State<'_, AppState>) -> Result<usize, AppError> {
    let db = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
    db.clear_lyrics_cache()
}

#[tauri::command]
pub async fn get_track_lyrics(
    title: String,
    artist: String,
    album: String,
    duration_ms: i64,
    file_path: Option<String>,
    state: State<'_, AppState>,
) -> Result<LyricsResult, AppError> {
    let lrclib_enabled = {
        let db = state
            .db
            .lock()
            .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
        db.get_lyrics_settings()?.lrclib_enabled
    };

    if let Some(ref path) = file_path {
        if !path.starts_with("http://") && !path.starts_with("https://") {
            if let Some(raw_lrc) = load_sidecar_lrc(Path::new(path)) {
                let synced_lines = parse_synced_lrc(&raw_lrc);
                return Ok(LyricsResult {
                    source: "local_lrc".to_string(),
                    instrumental: false,
                    plain_lyrics: Some(raw_lrc),
                    synced_lines,
                    lrclib_enabled,
                });
            }
        }
    }

    let key = lyrics_cache_key(&title, &artist, &album);
    let cached = {
        let db = state
            .db
            .lock()
            .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
        db.get_cached_lyrics(&key)?
    };

    if let Some(hit) = cached {
        let synced_lines = hit
            .synced_lyrics
            .as_deref()
            .map(parse_synced_lrc)
            .unwrap_or_default();
        return Ok(LyricsResult {
            source: hit.source,
            instrumental: hit.instrumental,
            plain_lyrics: hit.plain_lyrics,
            synced_lines,
            lrclib_enabled,
        });
    }

    if !lrclib_enabled {
        return Ok(LyricsResult {
            source: "disabled".to_string(),
            instrumental: false,
            plain_lyrics: None,
            synced_lines: Vec::new(),
            lrclib_enabled: false,
        });
    }

    let duration_sec = duration_ms.max(0) / 1000;
    let fetched = fetch_lrclib_lyrics(&title, &artist, &album, duration_sec).await?;

    let Some(payload) = fetched else {
        return Ok(LyricsResult {
            source: "not_found".to_string(),
            instrumental: false,
            plain_lyrics: None,
            synced_lines: Vec::new(),
            lrclib_enabled: true,
        });
    };

    let instrumental = payload.instrumental.unwrap_or(false);
    let synced_lines = payload
        .synced_lyrics
        .as_deref()
        .map(parse_synced_lrc)
        .unwrap_or_default();

    let record = CachedLyricsRecord {
        cache_key: key,
        title,
        artist,
        source: "lrclib".to_string(),
        instrumental,
        plain_lyrics: payload.plain_lyrics.clone(),
        synced_lyrics: payload.synced_lyrics,
        fetched_at: now_unix_secs(),
    };
    {
        let db = state
            .db
            .lock()
            .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
        db.upsert_cached_lyrics(&record)?;
    }

    Ok(LyricsResult {
        source: "lrclib".to_string(),
        instrumental,
        plain_lyrics: payload.plain_lyrics,
        synced_lines,
        lrclib_enabled: true,
    })
}
