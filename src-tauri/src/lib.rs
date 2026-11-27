pub mod audio;
pub mod cache;
pub mod commands;
pub mod database;
pub mod downloads;
pub mod error;
pub mod library;
pub mod lyrics;
pub mod metadata;
pub mod platform;
pub mod providers;
pub mod security;

use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use tauri::Manager;

use audio::AudioEngine;
use cache::CacheManager;
use database::Database;
use downloads::DownloadManager;
use platform::media_keys::MediaSession;
use providers::ProviderRegistry;

pub struct AppState {
    pub db: Arc<Mutex<Database>>,
    pub audio: AudioEngine,
    pub media_session: MediaSession,
    pub providers: Arc<ProviderRegistry>,
    pub downloads: DownloadManager,
    pub cache: CacheManager,
    pub artwork_dir: PathBuf,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let data_dir = app
                .path()
                .app_local_data_dir()
                .map_err(|e| std::io::Error::other(e.to_string()))?;
            let artwork_dir = data_dir.join("artwork");
            let downloads_dir = data_dir.join("downloads");
            let cache_dir = data_dir.join("playback_cache");
            std::fs::create_dir_all(&artwork_dir)?;
            let db_path = data_dir.join("auraliq.db");
            let db = Arc::new(Mutex::new(
                Database::open(&db_path).map_err(|e| std::io::Error::other(e.to_string()))?,
            ));
            let providers = Arc::new(ProviderRegistry::new());
            let downloads = DownloadManager::new(
                Arc::clone(&db),
                Arc::clone(&providers),
                downloads_dir,
                artwork_dir.clone(),
            )
            .map_err(|e| std::io::Error::other(e.to_string()))?;
            let cache = CacheManager::new(Arc::clone(&db), cache_dir)
                .map_err(|e| std::io::Error::other(e.to_string()))?;

            let media_session = MediaSession::init(app.handle());

            app.manage(AppState {
                db,
                audio: AudioEngine::new(),
                media_session,
                providers,
                downloads,
                cache,
                artwork_dir,
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_app_info,
            commands::library::list_folders,
            commands::library::add_folder,
            commands::library::remove_folder,
            commands::library::scan_library,
            commands::library::list_tracks,
            commands::library::search_tracks,
            commands::library::list_artists,
            commands::library::list_albums,
            commands::library::list_genres,
            commands::library::toggle_favorite,
            commands::library::list_recently_played,
            commands::library::search_tracks_filtered,
            commands::library::list_smart_playlists,
            commands::library::create_smart_playlist,
            commands::library::delete_smart_playlist,
            commands::library::get_smart_playlist_tracks,
            commands::library::list_collections,
            commands::library::create_collection,
            commands::library::delete_collection,
            commands::library::get_collection_tracks,
            commands::library::add_track_to_collection,
            commands::library::remove_track_from_collection,
            commands::library::find_duplicate_tracks,
            commands::library::list_identity_links,
            commands::library::set_identity_link_status,
            commands::playlists::list_playlists,
            commands::playlists::create_playlist,
            commands::playlists::rename_playlist,
            commands::playlists::delete_playlist,
            commands::playlists::get_playlist_tracks,
            commands::playlists::add_track_to_playlist,
            commands::playlists::remove_track_from_playlist,
            commands::playlists::import_playlist_file,
            commands::playlists::export_playlist_file,
            commands::player::play_track,
            commands::player::pause_playback,
            commands::player::resume_playback,
            commands::player::stop_playback,
            commands::player::seek_playback,
            commands::player::set_volume,
            commands::player::set_muted,
            commands::player::get_playback_status,
            commands::player::list_audio_devices,
            commands::player::set_audio_device,
            commands::player::get_visualizer_frame,
            commands::player::load_playback_state,
            commands::player::save_playback_state,
            commands::player::get_audio_enhancements,
            commands::player::set_audio_enhancements,
            commands::player::preload_next_track,
            commands::lyrics::get_lyrics_settings,
            commands::lyrics::set_lrclib_enabled,
            commands::lyrics::clear_lyrics_cache,
            commands::lyrics::get_track_lyrics,
            commands::providers::list_providers,
            commands::providers::set_provider_enabled,
            commands::providers::save_provider_credential,
            commands::providers::clear_provider_credential,
            commands::providers::search_provider,
            commands::providers::play_online_track,
            commands::providers::resolve_and_play_online_track,
            commands::downloads::list_downloads,
            commands::downloads::enqueue_download,
            commands::downloads::pause_download,
            commands::downloads::resume_download,
            commands::downloads::retry_download,
            commands::downloads::cancel_download,
            commands::downloads::remove_download,
            commands::downloads::clear_completed_downloads,
            commands::downloads::get_download_settings,
            commands::downloads::update_download_settings,
            commands::cache::get_cache_stats,
            commands::cache::list_cache_entries,
            commands::cache::update_cache_settings,
            commands::cache::clear_playback_cache,
            commands::cache::remove_cache_entry,
            commands::cache::run_cache_cleanup,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Auraliq");
}
