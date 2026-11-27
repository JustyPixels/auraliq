use tauri::State;

use crate::audio::PlaybackSnapshot;
use crate::database::models::PlaybackStateRecord;
use crate::error::AppError;
use crate::AppState;

#[tauri::command]
pub fn play_track(
    track_id: i64,
    start_ms: Option<u64>,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let file_path = {
        let db = state
            .db
            .lock()
            .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
        let track = db
            .get_track(track_id)?
            .ok_or_else(|| AppError::NotFound(format!("track {track_id}")))?;
        db.record_play(track_id)?;
        track.file_path
    };

    state.audio.load_and_play(file_path, start_ms.unwrap_or(0))
}

#[tauri::command]
pub fn pause_playback(state: State<'_, AppState>) -> Result<(), AppError> {
    state.audio.pause()
}

#[tauri::command]
pub fn resume_playback(state: State<'_, AppState>) -> Result<(), AppError> {
    state.audio.play()
}

#[tauri::command]
pub fn stop_playback(state: State<'_, AppState>) -> Result<(), AppError> {
    state.audio.stop()
}

#[tauri::command]
pub fn seek_playback(position_ms: u64, state: State<'_, AppState>) -> Result<(), AppError> {
    state.audio.seek(position_ms)
}

#[tauri::command]
pub fn set_volume(volume: f32, state: State<'_, AppState>) {
    state.audio.set_volume(volume);
}

#[tauri::command]
pub fn set_muted(muted: bool, state: State<'_, AppState>) {
    state.audio.set_muted(muted);
}

#[tauri::command]
pub fn get_playback_status(state: State<'_, AppState>) -> PlaybackSnapshot {
    state.audio.snapshot()
}

#[tauri::command]
pub fn load_playback_state(state: State<'_, AppState>) -> Result<PlaybackStateRecord, AppError> {
    let db = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
    db.load_playback_state()
}

#[tauri::command]
pub fn save_playback_state(
    playback_state: PlaybackStateRecord,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let db = state
        .db
        .lock()
        .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
    db.save_playback_state(&playback_state)
}
