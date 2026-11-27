use tauri::State;

use crate::database::models::{DownloadRecord, DownloadSettings};
use crate::downloads::infer_audio_ext;
use crate::error::AppError;
use crate::providers::OnlineTrack;
use crate::AppState;

#[tauri::command]
pub fn list_downloads(state: State<'_, AppState>) -> Result<Vec<DownloadRecord>, AppError> {
    state.downloads.list_downloads()
}

#[tauri::command]
pub async fn enqueue_download(
    track: OnlineTrack,
    state: State<'_, AppState>,
) -> Result<DownloadRecord, AppError> {
    state.downloads.verify_download_permitted(&track)?;

    let resolved_url = if let Some(url) = track
        .download_url
        .clone()
        .or_else(|| track.stream_url.clone())
    {
        url
    } else {
        state
            .providers
            .resolve_stream(&track.provider_id, &track.external_id)
            .await?
    };

    let ext = infer_audio_ext(&resolved_url);
    state.downloads.enqueue(&track, &resolved_url, &ext)
}

#[tauri::command]
pub fn pause_download(id: i64, state: State<'_, AppState>) -> Result<(), AppError> {
    state.downloads.pause(id)
}

#[tauri::command]
pub fn resume_download(id: i64, state: State<'_, AppState>) -> Result<(), AppError> {
    state.downloads.resume(id)
}

#[tauri::command]
pub fn retry_download(id: i64, state: State<'_, AppState>) -> Result<(), AppError> {
    state.downloads.retry(id)
}

#[tauri::command]
pub fn cancel_download(id: i64, state: State<'_, AppState>) -> Result<(), AppError> {
    state.downloads.cancel(id)
}

#[tauri::command]
pub fn remove_download(
    id: i64,
    delete_file: Option<bool>,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    state.downloads.remove(id, delete_file.unwrap_or(false))
}

#[tauri::command]
pub fn clear_completed_downloads(state: State<'_, AppState>) -> Result<usize, AppError> {
    state.downloads.clear_completed()
}

#[tauri::command]
pub fn get_download_settings(state: State<'_, AppState>) -> Result<DownloadSettings, AppError> {
    state.downloads.get_settings()
}

#[tauri::command]
pub fn update_download_settings(
    settings: DownloadSettings,
    state: State<'_, AppState>,
) -> Result<DownloadSettings, AppError> {
    state.downloads.update_settings(settings)
}
