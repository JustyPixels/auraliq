use tauri::State;

use crate::database::models::{CacheEntryRecord, CacheSettings, CacheStats};
use crate::error::AppError;
use crate::AppState;

#[tauri::command]
pub fn get_cache_stats(state: State<'_, AppState>) -> Result<CacheStats, AppError> {
    state.cache.get_stats()
}

#[tauri::command]
pub fn list_cache_entries(state: State<'_, AppState>) -> Result<Vec<CacheEntryRecord>, AppError> {
    state.cache.list_entries()
}

#[tauri::command]
pub fn update_cache_settings(
    settings: CacheSettings,
    state: State<'_, AppState>,
) -> Result<CacheSettings, AppError> {
    state.cache.update_settings(settings)
}

#[tauri::command]
pub fn clear_playback_cache(state: State<'_, AppState>) -> Result<usize, AppError> {
    state.cache.clear_all()
}

#[tauri::command]
pub fn remove_cache_entry(cache_key: String, state: State<'_, AppState>) -> Result<(), AppError> {
    state.cache.remove_entry(&cache_key)
}

#[tauri::command]
pub fn run_cache_cleanup(state: State<'_, AppState>) -> Result<usize, AppError> {
    state.cache.evict_expired_and_lru()
}
