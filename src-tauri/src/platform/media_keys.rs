use std::sync::Mutex;
use std::time::Duration;

use souvlaki::{
    MediaControlEvent, MediaControls, MediaMetadata, MediaPlayback, MediaPosition, PlatformConfig,
};
use tauri::{AppHandle, Emitter, Manager};

pub struct MediaSession {
    controls: Option<Mutex<MediaControls>>,
}

impl MediaSession {
    pub fn init(app: &AppHandle) -> Self {
        #[cfg(target_os = "windows")]
        let hwnd = app
            .get_webview_window("main")
            .and_then(|w| w.hwnd().ok())
            .map(|h| h.0);

        #[cfg(not(target_os = "windows"))]
        let hwnd: Option<*mut std::ffi::c_void> = None;

        let config = PlatformConfig {
            dbus_name: "auraliq",
            display_name: "Auraliq",
            hwnd,
        };

        let Ok(mut controls) = MediaControls::new(config) else {
            return Self { controls: None };
        };

        let app_handle = app.clone();
        if controls
            .attach(move |event: MediaControlEvent| {
                let action = match event {
                    MediaControlEvent::Play => Some("play"),
                    MediaControlEvent::Pause => Some("pause"),
                    MediaControlEvent::Toggle => Some("toggle"),
                    MediaControlEvent::Next => Some("next"),
                    MediaControlEvent::Previous => Some("previous"),
                    MediaControlEvent::Stop => Some("stop"),
                    _ => None,
                };
                if let Some(name) = action {
                    let _ = app_handle.emit("auraliq://media-control", name);
                }
            })
            .is_err()
        {
            return Self { controls: None };
        }

        Self {
            controls: Some(Mutex::new(controls)),
        }
    }

    pub fn update_metadata(&self, title: &str, artist: &str, album: &str, duration_ms: u64) {
        let Some(ref mutex) = self.controls else {
            return;
        };
        if let Ok(mut controls) = mutex.lock() {
            let _ = controls.set_metadata(MediaMetadata {
                title: Some(title),
                artist: Some(artist),
                album: Some(album),
                duration: (duration_ms > 0).then(|| Duration::from_millis(duration_ms)),
                cover_url: None,
            });
        }
    }

    pub fn update_playback(&self, status: &str, position_ms: u64) {
        let Some(ref mutex) = self.controls else {
            return;
        };
        if let Ok(mut controls) = mutex.lock() {
            let progress = Some(MediaPosition(Duration::from_millis(position_ms)));
            let playback = match status {
                "playing" => MediaPlayback::Playing { progress },
                "paused" => MediaPlayback::Paused { progress },
                _ => MediaPlayback::Stopped,
            };
            let _ = controls.set_playback(playback);
        }
    }
}
