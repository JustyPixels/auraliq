use tauri::State;

use crate::database::models::{
    AlbumSummary, ArtistSummary, CollectionRecord, DuplicateGroup, GenreSummary, LibraryFolder,
    ScanSummary, SearchFilters, SmartPlaylistRecord, SmartPlaylistRule, TrackIdentityLink,
    TrackRecord,
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

#[tauri::command]
pub fn search_tracks_filtered(
    filters: SearchFilters,
    state: State<'_, AppState>,
) -> Result<Vec<TrackRecord>, AppError> {
    let db = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
    db.search_tracks_filtered(&filters)
}

#[tauri::command]
pub fn list_smart_playlists(
    state: State<'_, AppState>,
) -> Result<Vec<SmartPlaylistRecord>, AppError> {
    let db = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
    db.list_smart_playlists()
}

#[tauri::command]
pub fn create_smart_playlist(
    name: String,
    match_mode: String,
    rules: Vec<SmartPlaylistRule>,
    state: State<'_, AppState>,
) -> Result<SmartPlaylistRecord, AppError> {
    if name.trim().is_empty() {
        return Err(AppError::Config(
            "Smart playlist name cannot be empty".to_string(),
        ));
    }
    let db = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
    db.create_smart_playlist(&name, &match_mode, &rules)
}

#[tauri::command]
pub fn delete_smart_playlist(smart_id: i64, state: State<'_, AppState>) -> Result<(), AppError> {
    let db = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
    db.delete_smart_playlist(smart_id)
}

#[tauri::command]
pub fn get_smart_playlist_tracks(
    smart_id: i64,
    state: State<'_, AppState>,
) -> Result<Vec<TrackRecord>, AppError> {
    let db = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
    db.get_smart_playlist_tracks(smart_id)
}

#[tauri::command]
pub fn list_collections(state: State<'_, AppState>) -> Result<Vec<CollectionRecord>, AppError> {
    let db = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
    db.list_collections()
}

#[tauri::command]
pub fn create_collection(
    name: String,
    description: Option<String>,
    state: State<'_, AppState>,
) -> Result<CollectionRecord, AppError> {
    if name.trim().is_empty() {
        return Err(AppError::Config(
            "Collection name cannot be empty".to_string(),
        ));
    }
    let db = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
    db.create_collection(&name, description.as_deref().unwrap_or(""))
}

#[tauri::command]
pub fn delete_collection(collection_id: i64, state: State<'_, AppState>) -> Result<(), AppError> {
    let db = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
    db.delete_collection(collection_id)
}

#[tauri::command]
pub fn get_collection_tracks(
    collection_id: i64,
    state: State<'_, AppState>,
) -> Result<Vec<TrackRecord>, AppError> {
    let db = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
    db.get_collection_tracks(collection_id)
}

#[tauri::command]
pub fn add_track_to_collection(
    collection_id: i64,
    track_id: i64,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let db = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
    db.add_track_to_collection(collection_id, track_id)
}

#[tauri::command]
pub fn remove_track_from_collection(
    collection_id: i64,
    track_id: i64,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let db = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
    db.remove_track_from_collection(collection_id, track_id)
}

#[tauri::command]
pub fn find_duplicate_tracks(state: State<'_, AppState>) -> Result<Vec<DuplicateGroup>, AppError> {
    let db = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
    db.find_duplicate_tracks()
}

#[tauri::command]
pub fn list_identity_links(state: State<'_, AppState>) -> Result<Vec<TrackIdentityLink>, AppError> {
    let db = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
    db.list_identity_links()
}

#[tauri::command]
pub fn set_identity_link_status(
    track_a_id: i64,
    track_b_id: i64,
    status: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let db = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
    db.set_identity_link_status(track_a_id, track_b_id, &status)
}
