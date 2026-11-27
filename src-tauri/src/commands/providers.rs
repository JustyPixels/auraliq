use tauri::State;

use crate::error::AppError;
use crate::providers::{OnlineTrack, ProviderInfo, ProviderSearchResult};
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

#[tauri::command]
pub async fn resolve_and_play_online_track(
    track: OnlineTrack,
    state: State<'_, AppState>,
) -> Result<String, AppError> {
    let provider = state
        .providers
        .get(&track.provider_id)
        .ok_or_else(|| AppError::NotFound(format!("provider {}", track.provider_id)))?;
    if !provider.capabilities().stream_playback {
        return Err(AppError::UnsupportedProviderAction(format!(
            "'{}' does not permit direct in-app audio streaming",
            provider.name()
        )));
    }

    let cache_allowed = provider.capabilities().offline_cache_allowed;
    if cache_allowed {
        if let Some(cached_path) = state
            .cache
            .lookup_valid(&track.provider_id, &track.external_id)?
        {
            let path_str = cached_path.to_string_lossy().into_owned();
            state.audio.load_and_play(path_str.clone(), 0)?;
            state.media_session.update_metadata(
                &track.title,
                &track.artist,
                &track.album,
                track.duration_ms.max(0) as u64,
            );
            state.media_session.update_playback("playing", 0);
            return Ok(path_str);
        }
    }

    let cache_settings = state.cache.get_settings()?;
    if cache_settings.offline_mode {
        return Err(AppError::Provider(
            "Offline mode is enabled and this track is not cached locally.".to_string(),
        ));
    }

    let resolved = if track.provider_id == "radio_browser" || track.stream_url.is_none() {
        state
            .providers
            .resolve_stream(&track.provider_id, &track.external_id)
            .await?
    } else {
        track
            .stream_url
            .clone()
            .ok_or_else(|| AppError::Provider("Missing stream URL".to_string()))?
    };

    let validated = validate_remote_url(&resolved, true)?;
    let final_url = validated.to_string();
    state.audio.load_and_play_url(final_url.clone())?;
    state.media_session.update_metadata(
        &track.title,
        &track.artist,
        &track.album,
        track.duration_ms.max(0) as u64,
    );
    state.media_session.update_playback("playing", 0);

    if cache_allowed && cache_settings.enabled {
        state.cache.spawn_background_cache_url(
            track.provider_id,
            track.external_id,
            track.title,
            track.artist,
            final_url.clone(),
        );
    }

    Ok(final_url)
}
