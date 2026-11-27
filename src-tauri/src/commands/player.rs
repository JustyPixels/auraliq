use tauri::State;

use crate::audio::{
    list_audio_devices as enumerate_audio_devices, AudioDeviceInfo, AudioEnhancementsConfig,
    PlaybackSnapshot, VisualizerFrame,
};
use crate::database::models::PlaybackStateRecord;
use crate::error::AppError;
use crate::AppState;

#[tauri::command]
pub fn play_track(
    track_id: i64,
    start_ms: Option<u64>,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let track = {
        let db = state
            .db
            .lock()
            .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
        let track = db
            .get_track(track_id)?
            .ok_or_else(|| AppError::NotFound(format!("track {track_id}")))?;
        db.record_play(track_id)?;
        track
    };

    let pos = start_ms.unwrap_or(0);
    state.audio.load_and_play(track.file_path, pos)?;
    state.media_session.update_metadata(
        &track.title,
        &track.artist,
        &track.album,
        track.duration_ms.max(0) as u64,
    );
    state.media_session.update_playback("playing", pos);
    Ok(())
}

#[tauri::command]
pub fn pause_playback(state: State<'_, AppState>) -> Result<(), AppError> {
    state.audio.pause()?;
    let snap = state.audio.snapshot();
    state
        .media_session
        .update_playback("paused", snap.position_ms);
    Ok(())
}

#[tauri::command]
pub fn resume_playback(state: State<'_, AppState>) -> Result<(), AppError> {
    state.audio.play()?;
    let snap = state.audio.snapshot();
    state
        .media_session
        .update_playback("playing", snap.position_ms);
    Ok(())
}

#[tauri::command]
pub fn stop_playback(state: State<'_, AppState>) -> Result<(), AppError> {
    state.audio.stop()?;
    state.media_session.update_playback("stopped", 0);
    Ok(())
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
pub fn list_audio_devices() -> Vec<AudioDeviceInfo> {
    enumerate_audio_devices()
}

#[tauri::command]
pub fn set_audio_device(
    device_name: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    state.audio.select_output_device(device_name)
}

#[tauri::command]
pub fn get_visualizer_frame(state: State<'_, AppState>) -> VisualizerFrame {
    state.audio.visualizer_frame()
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

#[tauri::command]
pub fn get_audio_enhancements(state: State<'_, AppState>) -> AudioEnhancementsConfig {
    state.audio.get_enhancements()
}

#[tauri::command]
pub fn set_audio_enhancements(
    config: AudioEnhancementsConfig,
    state: State<'_, AppState>,
) -> Result<AudioEnhancementsConfig, AppError> {
    let clamped = config.clamped();
    state.audio.set_enhancements(clamped.clone())?;
    Ok(clamped)
}

#[tauri::command]
pub fn preload_next_track(track_id: i64, state: State<'_, AppState>) -> Result<(), AppError> {
    let track = {
        let db = state
            .db
            .lock()
            .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
        db.get_track(track_id)?
    };
    if let Some(t) = track {
        state.audio.preload_next(t.file_path)?;
    }
    Ok(())
}
