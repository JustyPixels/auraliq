use tauri::State;

use crate::error::AppError;
use crate::providers::{ProviderInfo, ProviderSearchResult};
use crate::security::credentials::CredentialStore;
use crate::security::validation::validate_remote_url;
use crate::AppState;

#[tauri::command]
pub fn list_providers(state: State<'_, AppState>) -> Result<Vec<ProviderInfo>, AppError> {
    let db = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
    Ok(state.providers.list_providers(&db))
}

#[tauri::command]
pub fn set_provider_enabled(
    provider_id: String,
    enabled: bool,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    if state.providers.get(&provider_id).is_none() {
        return Err(AppError::NotFound(format!("provider {provider_id}")));
    }
    let db = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
    db.set_provider_enabled(&provider_id, enabled)
}

#[tauri::command]
pub fn save_provider_credential(
    provider_id: String,
    field: String,
    value: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    if state.providers.get(&provider_id).is_none() {
        return Err(AppError::NotFound(format!("provider {provider_id}")));
    }
    CredentialStore::set_secret(&provider_id, &field, &value)
}

#[tauri::command]
pub fn clear_provider_credential(
    provider_id: String,
    field: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    if state.providers.get(&provider_id).is_none() {
        return Err(AppError::NotFound(format!("provider {provider_id}")));
    }
    CredentialStore::delete_secret(&provider_id, &field)
}

#[tauri::command]
pub async fn search_provider(
    provider_id: String,
    query: String,
    limit: Option<usize>,
    state: State<'_, AppState>,
) -> Result<ProviderSearchResult, AppError> {
    let enabled = {
        let provider = state
            .providers
            .get(&provider_id)
            .ok_or_else(|| AppError::NotFound(format!("provider {provider_id}")))?;
        let db = state
            .db
            .lock()
            .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
        db.is_provider_enabled(&provider_id, provider.default_enabled())?
    };

    state
        .providers
        .search(&provider_id, enabled, &query, limit.unwrap_or(20))
        .await
}

#[tauri::command]
pub fn play_online_track(
    provider_id: String,
    stream_url: String,
    title: String,
    artist: String,
    album: String,
    duration_ms: Option<i64>,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let provider = state
        .providers
        .get(&provider_id)
        .ok_or_else(|| AppError::NotFound(format!("provider {provider_id}")))?;
    if !provider.capabilities().stream_playback {
        return Err(AppError::UnsupportedProviderAction(format!(
            "'{}' does not permit direct in-app audio streaming",
            provider.name()
        )));
    }
    let validated = validate_remote_url(&stream_url, true)?;
    state.audio.load_and_play_url(validated.to_string())?;
    state.media_session.update_metadata(
        &title,
        &artist,
        &album,
        duration_ms.unwrap_or(0).max(0) as u64,
    );
    state.media_session.update_playback("playing", 0);
    Ok(())
}
