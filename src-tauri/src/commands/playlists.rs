use std::fs;
use std::path::Path;

use tauri::State;

use crate::database::models::{PlaylistRecord, TrackRecord};
use crate::error::AppError;
use crate::library::playlists::{export_m3u8, export_pls, parse_m3u, parse_pls};
use crate::AppState;

#[tauri::command]
pub fn list_playlists(state: State<'_, AppState>) -> Result<Vec<PlaylistRecord>, AppError> {
    let db = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
    db.list_playlists()
}

#[tauri::command]
pub fn create_playlist(
    name: String,
    description: Option<String>,
    state: State<'_, AppState>,
) -> Result<PlaylistRecord, AppError> {
    if name.trim().is_empty() {
        return Err(AppError::Config(
            "Playlist name cannot be empty".to_string(),
        ));
    }
    let db = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
    db.create_playlist(&name, description.as_deref().unwrap_or(""))
}

#[tauri::command]
pub fn rename_playlist(
    playlist_id: i64,
    name: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    if name.trim().is_empty() {
        return Err(AppError::Config(
            "Playlist name cannot be empty".to_string(),
        ));
    }
    let db = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
    db.rename_playlist(playlist_id, &name)
}

#[tauri::command]
pub fn delete_playlist(playlist_id: i64, state: State<'_, AppState>) -> Result<(), AppError> {
    let db = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
    db.delete_playlist(playlist_id)
}

#[tauri::command]
pub fn get_playlist_tracks(
    playlist_id: i64,
    state: State<'_, AppState>,
) -> Result<Vec<TrackRecord>, AppError> {
    let db = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
    db.get_playlist_tracks(playlist_id)
}

#[tauri::command]
pub fn add_track_to_playlist(
    playlist_id: i64,
    track_id: i64,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let db = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
    db.add_track_to_playlist(playlist_id, track_id)
}

#[tauri::command]
pub fn remove_track_from_playlist(
    playlist_id: i64,
    track_id: i64,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let db = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
    db.remove_track_from_playlist(playlist_id, track_id)
}

#[tauri::command]
pub fn import_playlist_file(
    file_path: String,
    state: State<'_, AppState>,
) -> Result<PlaylistRecord, AppError> {
    let path = Path::new(&file_path);
    let content = fs::read_to_string(path)?;
    let base_dir = path.parent().unwrap_or_else(|| Path::new("."));
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();

    let entries = if ext == "pls" {
        parse_pls(&content, base_dir)
    } else {
        parse_m3u(&content, base_dir)
    };

    let name = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Imported Playlist")
        .to_string();

    let db = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
    let playlist = db.create_playlist(&name, "Imported playlist")?;

    for entry in entries {
        let entry_str = entry.to_string_lossy();
        if let Some(track_id) = db.find_track_id_by_path(&entry_str)? {
            db.add_track_to_playlist(playlist.id, track_id)?;
        }
    }

    Ok(playlist)
}

#[tauri::command]
pub fn export_playlist_file(
    playlist_id: i64,
    file_path: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let db = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
    let tracks = db.get_playlist_tracks(playlist_id)?;
    let path = Path::new(&file_path);
    let is_pls = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.eq_ignore_ascii_case("pls"))
        .unwrap_or(false);

    let body = if is_pls {
        export_pls(&tracks)
    } else {
        export_m3u8(&tracks)
    };
    fs::write(path, body)?;
    Ok(())
}
