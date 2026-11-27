use tauri::State;

use crate::database::models::{
    AlbumSummary, ArtistSummary, GenreSummary, LibraryFolder, ScanSummary, TrackRecord,
};
use crate::error::AppError;
use crate::library::scan_all_folders;
use crate::AppState;

#[tauri::command]
pub fn list_folders(state: State<'_, AppState>) -> Result<Vec<LibraryFolder>, AppError> {
    let db = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
    db.list_folders()
}

#[tauri::command]
pub fn add_folder(path: String, state: State<'_, AppState>) -> Result<LibraryFolder, AppError> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err(AppError::Config("Folder path cannot be empty".to_string()));
    }
    let db = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
    db.add_folder(trimmed)
}

#[tauri::command]
pub fn remove_folder(folder_id: i64, state: State<'_, AppState>) -> Result<(), AppError> {
    let db = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
    db.remove_folder(folder_id)
}

#[tauri::command]
pub fn scan_library(state: State<'_, AppState>) -> Result<ScanSummary, AppError> {
    let db = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
    scan_all_folders(&db, &state.artwork_dir)
}

#[tauri::command]
pub fn list_tracks(
    favorites_only: Option<bool>,
    sort_by: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<TrackRecord>, AppError> {
    let db = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
    db.list_tracks(favorites_only.unwrap_or(false), sort_by.as_deref())
}

#[tauri::command]
pub fn search_tracks(
    query: String,
    state: State<'_, AppState>,
) -> Result<Vec<TrackRecord>, AppError> {
    let db = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
    db.search_tracks(&query)
}

#[tauri::command]
pub fn list_artists(state: State<'_, AppState>) -> Result<Vec<ArtistSummary>, AppError> {
    let db = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
    db.list_artists()
}

#[tauri::command]
pub fn list_albums(state: State<'_, AppState>) -> Result<Vec<AlbumSummary>, AppError> {
    let db = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
    db.list_albums()
}

#[tauri::command]
pub fn list_genres(state: State<'_, AppState>) -> Result<Vec<GenreSummary>, AppError> {
    let db = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
    db.list_genres()
}

#[tauri::command]
pub fn toggle_favorite(track_id: i64, state: State<'_, AppState>) -> Result<bool, AppError> {
    let db = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
    db.toggle_favorite(track_id)
}

#[tauri::command]
pub fn list_recently_played(
    limit: Option<usize>,
    state: State<'_, AppState>,
) -> Result<Vec<TrackRecord>, AppError> {
    let db = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
    db.list_recently_played(limit.unwrap_or(50))
}
