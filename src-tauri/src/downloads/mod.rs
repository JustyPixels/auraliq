use std::collections::HashMap;
use std::fs::{self, File, OpenOptions};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant, UNIX_EPOCH};

use reqwest::header::RANGE;
use reqwest::StatusCode;

use crate::database::models::{DownloadRecord, DownloadSettings, NewTrackData};
use crate::database::Database;
use crate::error::AppError;
use crate::metadata::{extract_metadata, write_track_tags};
use crate::providers::{OnlineTrack, ProviderRegistry};
use crate::security::validation::{sanitize_filename, validate_remote_url};

const ALLOWED_AUDIO_EXTS: &[&str] = &["mp3", "flac", "ogg", "m4a", "wav", "opus"];

#[derive(Default)]
struct JobControl {
    pause_flag: AtomicBool,
    cancel_flag: AtomicBool,
}

#[derive(Clone)]
pub struct DownloadManager {
    db: Arc<Mutex<Database>>,
    providers: Arc<ProviderRegistry>,
    default_download_dir: PathBuf,
    artwork_dir: PathBuf,
    active_controls: Arc<Mutex<HashMap<i64, Arc<JobControl>>>>,
    dispatch_lock: Arc<Mutex<()>>,
}

impl DownloadManager {
    pub fn new(
        db: Arc<Mutex<Database>>,
        providers: Arc<ProviderRegistry>,
        default_download_dir: PathBuf,
        artwork_dir: PathBuf,
    ) -> Result<Self, AppError> {
        fs::create_dir_all(&default_download_dir)?;
        {
            let guard = db
                .lock()
                .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
            let _ = guard.reset_interrupted_downloads()?;
        }
        Ok(Self {
            db,
            providers,
            default_download_dir,
            artwork_dir,
            active_controls: Arc::new(Mutex::new(HashMap::new())),
            dispatch_lock: Arc::new(Mutex::new(())),
        })
    }

    pub fn get_settings(&self) -> Result<DownloadSettings, AppError> {
        let default_dir = self.default_download_dir.to_string_lossy().into_owned();
        let db = self
            .db
            .lock()
            .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
        db.get_download_settings(&default_dir)
    }

    pub fn update_settings(
        &self,
        mut settings: DownloadSettings,
    ) -> Result<DownloadSettings, AppError> {
        settings.max_concurrent = settings.max_concurrent.clamp(1, 4);
        if settings.naming_template.trim().is_empty() {
            settings.naming_template = "{artist} - {title}".to_string();
        }
        if settings.download_dir.trim().is_empty() {
            settings.download_dir = self.default_download_dir.to_string_lossy().into_owned();
        }
        fs::create_dir_all(&settings.download_dir)?;
        {
            let db = self
                .db
                .lock()
                .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
            db.save_download_settings(&settings)?;
        }
        self.pump_queue();
        Ok(settings)
    }

    pub fn list_downloads(&self) -> Result<Vec<DownloadRecord>, AppError> {
        let db = self
            .db
            .lock()
            .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
        db.list_downloads()
    }

    pub fn verify_download_permitted(&self, track: &OnlineTrack) -> Result<(), AppError> {
        let provider = self
            .providers
            .get(&track.provider_id)
            .ok_or_else(|| AppError::NotFound(format!("provider {}", track.provider_id)))?;
        if !provider.capabilities().download || !track.downloadable {
            return Err(AppError::UnsupportedProviderAction(format!(
                "Downloads are not permitted for '{}' on '{}'",
                track.title,
                provider.name()
            )));
        }
        Ok(())
    }

    pub fn enqueue(
        &self,
        track: &OnlineTrack,
        validated_source_url: &str,
        ext: &str,
    ) -> Result<DownloadRecord, AppError> {
        self.verify_download_permitted(track)?;
        let validated = validate_remote_url(validated_source_url, true)?;
        let settings = self.get_settings()?;
        let base_dir = PathBuf::from(&settings.download_dir);
        fs::create_dir_all(&base_dir)?;

        let target_path = resolve_target_path(
            &base_dir,
            &settings.naming_template,
            &track.artist,
            &track.album,
            &track.title,
            ext,
        )?;

        let record = {
            let db = self
                .db
                .lock()
                .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
            db.insert_download(
                &track.provider_id,
                &track.external_id,
                &track.title,
                &track.artist,
                &track.album,
                track.license.as_deref(),
                track.artwork_url.as_deref(),
                Some(validated.as_str()),
                &target_path.to_string_lossy(),
            )?
        };

        self.pump_queue();
        Ok(record)
    }

    pub fn pause(&self, id: i64) -> Result<(), AppError> {
        if let Ok(guard) = self.active_controls.lock() {
            if let Some(ctrl) = guard.get(&id) {
                ctrl.pause_flag.store(true, Ordering::Relaxed);
                return Ok(());
            }
        }
        let db = self
            .db
            .lock()
            .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
        if let Some(rec) = db.get_download(id)? {
            if rec.status == "queued" {
                db.update_download_status(id, "paused", None)?;
            }
        }
        Ok(())
    }

    pub fn resume(&self, id: i64) -> Result<(), AppError> {
        {
            let db = self
                .db
                .lock()
                .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
            let rec = db
                .get_download(id)?
                .ok_or_else(|| AppError::NotFound(format!("download {id}")))?;
            if rec.status == "paused" || rec.status == "failed" {
                db.update_download_status(id, "queued", None)?;
            }
        }
        self.pump_queue();
        Ok(())
    }

    pub fn retry(&self, id: i64) -> Result<(), AppError> {
        {
            let db = self
                .db
                .lock()
                .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
            let rec = db
                .get_download(id)?
                .ok_or_else(|| AppError::NotFound(format!("download {id}")))?;
            if rec.status == "failed" || rec.status == "canceled" || rec.status == "paused" {
                db.update_download_status(id, "queued", None)?;
            }
        }
        self.pump_queue();
        Ok(())
    }

    pub fn cancel(&self, id: i64) -> Result<(), AppError> {
        if let Ok(guard) = self.active_controls.lock() {
            if let Some(ctrl) = guard.get(&id) {
                ctrl.cancel_flag.store(true, Ordering::Relaxed);
                return Ok(());
            }
        }
        let target = {
            let db = self
                .db
                .lock()
                .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
            let rec = db
                .get_download(id)?
                .ok_or_else(|| AppError::NotFound(format!("download {id}")))?;
            db.update_download_status(id, "canceled", None)?;
            rec.target_path
        };
        let _ = fs::remove_file(part_path_for(Path::new(&target)));
        Ok(())
    }

    pub fn remove(&self, id: i64, delete_file: bool) -> Result<(), AppError> {
        let _ = self.cancel(id);
        let rec = {
            let db = self
                .db
                .lock()
                .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
            let found = db.get_download(id)?;
            db.delete_download(id)?;
            found
        };
        if let Some(r) = rec {
            let _ = fs::remove_file(part_path_for(Path::new(&r.target_path)));
            if delete_file {
                let _ = fs::remove_file(&r.target_path);
            }
        }
        Ok(())
    }

    pub fn clear_completed(&self) -> Result<usize, AppError> {
        let db = self
            .db
            .lock()
            .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
        db.clear_completed_downloads()
    }

    pub fn pump_queue(&self) {
        let Ok(_dispatch) = self.dispatch_lock.lock() else {
            return;
        };
        let Ok(settings) = self.get_settings() else {
            return;
        };
        let max_concurrent = settings.max_concurrent.clamp(1, 4) as usize;

        loop {
            let active_count = self
                .active_controls
                .lock()
                .map(|g| g.len())
                .unwrap_or(max_concurrent);
            if active_count >= max_concurrent {
                break;
            }

            let next_job = {
                let Ok(db) = self.db.lock() else {
                    break;
                };
                match db.next_queued_download() {
                    Ok(Some(rec)) => {
                        let _ = db.update_download_status(rec.id, "downloading", None);
                        Some(rec)
                    }
                    _ => None,
                }
            };

            let Some(record) = next_job else {
                break;
            };

            let control = Arc::new(JobControl::default());
            if let Ok(mut guard) = self.active_controls.lock() {
                guard.insert(record.id, Arc::clone(&control));
            }

            let manager = self.clone();
            thread::spawn(move || {
                manager.run_download_worker(record, control);
            });
        }
    }

    fn run_download_worker(&self, record: DownloadRecord, control: Arc<JobControl>) {
        let result = self.execute_download(&record, &control);

        if let Ok(mut guard) = self.active_controls.lock() {
            guard.remove(&record.id);
        }

        match result {
            Ok(WorkerOutcome::Completed(final_size)) => {
                if let Ok(db) = self.db.lock() {
                    let _ = db.update_download_progress(record.id, final_size, Some(final_size));
                    let _ = db.update_download_status(record.id, "completed", None);
                }
            }
            Ok(WorkerOutcome::Paused) => {
                if let Ok(db) = self.db.lock() {
                    let _ = db.update_download_status(record.id, "paused", None);
                }
            }
            Ok(WorkerOutcome::Canceled) => {
                let _ = fs::remove_file(part_path_for(Path::new(&record.target_path)));
                if let Ok(db) = self.db.lock() {
                    let _ = db.update_download_status(record.id, "canceled", None);
                }
            }
            Err(err) => {
                if let Ok(db) = self.db.lock() {
                    let _ = db.update_download_status(record.id, "failed", Some(&err.to_string()));
                }
            }
        }

        self.pump_queue();
    }

    fn execute_download(
        &self,
        record: &DownloadRecord,
        control: &JobControl,
    ) -> Result<WorkerOutcome, AppError> {
        let source_url = record
            .source_url
            .as_deref()
            .ok_or_else(|| AppError::Provider("Missing download source URL".to_string()))?;
        let parsed = validate_remote_url(source_url, true)?;

        let target_path = PathBuf::from(&record.target_path);
        if let Some(parent) = target_path.parent() {
            fs::create_dir_all(parent)?;
        }
        let part_path = part_path_for(&target_path);
        let existing_bytes = fs::metadata(&part_path).map(|m| m.len()).unwrap_or(0);

        let client = reqwest::blocking::Client::builder()
            .user_agent("Auraliq/0.6.0 (https://github.com/JustyPixels/auraliq)")
            .timeout(Duration::from_secs(60))
            .build()
            .map_err(|e| AppError::Provider(format!("Download HTTP client error: {e}")))?;

        let mut req = client.get(parsed);
        if existing_bytes > 0 {
            req = req.header(RANGE, format!("bytes={existing_bytes}-"));
        }

        let mut resp = req
            .send()
            .map_err(|e| AppError::Provider(format!("Download request failed: {e}")))?;

        validate_remote_url(resp.url().as_str(), true)?;

        if !resp.status().is_success() && resp.status() != StatusCode::PARTIAL_CONTENT {
            return Err(AppError::Provider(format!(
                "Download returned HTTP {}",
                resp.status()
            )));
        }

        let (mut file, mut written, total_bytes) = if resp.status() == StatusCode::PARTIAL_CONTENT {
            let f = OpenOptions::new()
                .create(true)
                .append(true)
                .open(&part_path)?;
            let total = resp
                .content_length()
                .map(|rem| existing_bytes as i64 + rem as i64);
            (f, existing_bytes as i64, total)
        } else {
            let f = File::create(&part_path)?;
            let total = resp.content_length().map(|len| len as i64);
            (f, 0i64, total)
        };

        if let Ok(db) = self.db.lock() {
            let _ = db.update_download_progress(record.id, written, total_bytes);
        }

        let mut buf = [0u8; 32 * 1024];
        let mut last_report = Instant::now();

        loop {
            if control.cancel_flag.load(Ordering::Relaxed) {
                drop(file);
                return Ok(WorkerOutcome::Canceled);
            }
            if control.pause_flag.load(Ordering::Relaxed) {
                let _ = file.flush();
                if let Ok(db) = self.db.lock() {
                    let _ = db.update_download_progress(record.id, written, total_bytes);
                }
                return Ok(WorkerOutcome::Paused);
            }

            let n = resp
                .read(&mut buf)
                .map_err(|e| AppError::Io(format!("Download stream read error: {e}")))?;
            if n == 0 {
                break;
            }
            file.write_all(&buf[..n])?;
            written += n as i64;

            if last_report.elapsed() >= Duration::from_millis(200) {
                if let Ok(db) = self.db.lock() {
                    let _ = db.update_download_progress(record.id, written, total_bytes);
                }
                last_report = Instant::now();
            }
        }

        file.flush()?;
        drop(file);

        if target_path.exists() {
            let _ = fs::remove_file(&target_path);
        }
        fs::rename(&part_path, &target_path)?;

        let settings = self.get_settings()?;
        if settings.auto_tag {
            let _ = write_track_tags(
                &target_path,
                &record.title,
                &record.artist,
                &record.album,
                record.license.as_deref(),
            );
        }

        if settings.auto_add_to_library {
            let mut new_track = match extract_metadata(&target_path, &self.artwork_dir) {
                Ok(mut parsed_meta) => {
                    parsed_meta.source_provider = record.provider_id.clone();
                    parsed_meta
                }
                Err(_) => {
                    let meta = fs::metadata(&target_path)?;
                    let modified_at = meta
                        .modified()
                        .ok()
                        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                        .map(|d| d.as_secs() as i64)
                        .unwrap_or(0);
                    NewTrackData {
                        source_provider: record.provider_id.clone(),
                        file_path: target_path.to_string_lossy().into_owned(),
                        title: record.title.clone(),
                        artist: record.artist.clone(),
                        album: record.album.clone(),
                        album_artist: record.artist.clone(),
                        genre: "Online Download".to_string(),
                        duration_ms: 0,
                        track_number: None,
                        disc_number: None,
                        release_year: None,
                        format: target_path
                            .extension()
                            .and_then(|e| e.to_str())
                            .unwrap_or("mp3")
                            .to_string(),
                        bitrate_kbps: None,
                        sample_rate_hz: None,
                        artwork_path: None,
                        file_size: meta.len() as i64,
                        modified_at,
                    }
                }
            };
            new_track.source_provider = record.provider_id.clone();
            if let Ok(db) = self.db.lock() {
                let _ = db.upsert_track(&new_track);
            }
        }

        Ok(WorkerOutcome::Completed(written))
    }
}

enum WorkerOutcome {
    Completed(i64),
    Paused,
    Canceled,
}

fn part_path_for(target: &Path) -> PathBuf {
    let mut os = target.as_os_str().to_os_string();
    os.push(".part");
    PathBuf::from(os)
}

pub fn infer_audio_ext(url: &str) -> String {
    if let Ok(parsed) = url::Url::parse(url) {
        if let Some(ext) = Path::new(parsed.path())
            .extension()
            .and_then(|e| e.to_str())
        {
            let lower = ext.to_ascii_lowercase();
            if ALLOWED_AUDIO_EXTS.contains(&lower.as_str()) {
                return lower;
            }
        }
    }
    "mp3".to_string()
}

pub fn resolve_target_path(
    base_dir: &Path,
    template: &str,
    artist: &str,
    album: &str,
    title: &str,
    ext: &str,
) -> Result<PathBuf, AppError> {
    let safe_artist = if artist.trim().is_empty() {
        "Unknown Artist"
    } else {
        artist.trim()
    };
    let safe_album = if album.trim().is_empty() {
        "Unknown Album"
    } else {
        album.trim()
    };
    let safe_title = if title.trim().is_empty() {
        "Untitled Track"
    } else {
        title.trim()
    };

    let clean_ext = {
        let lower = ext.trim().trim_start_matches('.').to_ascii_lowercase();
        if ALLOWED_AUDIO_EXTS.contains(&lower.as_str()) {
            lower
        } else {
            "mp3".to_string()
        }
    };

    let rendered = template
        .replace("{artist}", safe_artist)
        .replace("{album}", safe_album)
        .replace("{title}", safe_title);

    let segments: Vec<&str> = rendered
        .split('/')
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .collect();
    if segments.is_empty() {
        return Err(AppError::Config(
            "Download naming template produced an empty path".to_string(),
        ));
    }

    let mut path = base_dir.to_path_buf();
    for (idx, seg) in segments.iter().enumerate() {
        let sanitized = sanitize_filename(seg)?;
        if idx + 1 == segments.len() {
            let mut candidate = path.join(format!("{sanitized}.{clean_ext}"));
            let mut counter = 1usize;
            while candidate.exists() || part_path_for(&candidate).exists() {
                candidate = path.join(format!("{sanitized} ({counter}).{clean_ext}"));
                counter += 1;
            }
            path = candidate;
        } else {
            path.push(sanitized);
        }
    }

    Ok(path)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    fn sample_online_track(provider_id: &str, downloadable: bool) -> OnlineTrack {
        OnlineTrack {
            provider_id: provider_id.to_string(),
            external_id: "item-1".to_string(),
            title: "Synth: Horizon?".to_string(),
            artist: "Retro/Artist".to_string(),
            album: "Analog Waves".to_string(),
            duration_ms: 120_000,
            stream_url: Some("https://archive.org/download/item-1/track.mp3".to_string()),
            download_url: None,
            artwork_url: None,
            external_url: None,
            license: Some("https://creativecommons.org/licenses/by/4.0/".to_string()),
            downloadable,
        }
    }

    #[test]
    fn enforces_provider_download_permissions() {
        let dir = tempdir().unwrap();
        let db = Arc::new(Mutex::new(Database::open_in_memory().unwrap()));
        let providers = Arc::new(ProviderRegistry::new());
        let dm = DownloadManager::new(
            db,
            providers,
            dir.path().join("downloads"),
            dir.path().join("artwork"),
        )
        .unwrap();

        assert!(dm
            .verify_download_permitted(&sample_online_track("youtube", true))
            .is_err());
        assert!(dm
            .verify_download_permitted(&sample_online_track("radio_browser", true))
            .is_err());
        assert!(dm
            .verify_download_permitted(&sample_online_track("audius", true))
            .is_err());
        assert!(dm
            .verify_download_permitted(&sample_online_track("jamendo", false))
            .is_err());

        assert!(dm
            .verify_download_permitted(&sample_online_track("internet_archive", true))
            .is_ok());
        assert!(dm
            .verify_download_permitted(&sample_online_track("jamendo", true))
            .is_ok());
    }

    #[test]
    fn resolves_and_sanitizes_naming_templates() {
        let dir = tempdir().unwrap();
        let path = resolve_target_path(
            dir.path(),
            "{artist}/{album}/{title}",
            "Retro Artist",
            "Night: Signals",
            "Track 01?",
            "mp3",
        )
        .unwrap();
        assert!(path.starts_with(dir.path()));
        assert_eq!(path.file_name().unwrap(), "Track 01_.mp3");

        assert!(resolve_target_path(dir.path(), "../{title}", "A", "B", "C", "mp3").is_err());
    }

    #[test]
    fn resets_interrupted_downloads_and_clamps_settings() {
        let dir = tempdir().unwrap();
        let db = Arc::new(Mutex::new(Database::open_in_memory().unwrap()));
        {
            let guard = db.lock().unwrap();
            let rec = guard
                .insert_download(
                    "internet_archive",
                    "id1",
                    "Title",
                    "Artist",
                    "Album",
                    None,
                    None,
                    Some("https://archive.org/download/id1/t.mp3"),
                    "E:\\Downloads\\t.mp3",
                )
                .unwrap();
            guard
                .update_download_status(rec.id, "downloading", None)
                .unwrap();
        }

        let providers = Arc::new(ProviderRegistry::new());
        let dm = DownloadManager::new(
            Arc::clone(&db),
            providers,
            dir.path().join("downloads"),
            dir.path().join("artwork"),
        )
        .unwrap();

        let list = dm.list_downloads().unwrap();
        assert_eq!(list[0].status, "paused");

        let updated = dm
            .update_settings(DownloadSettings {
                download_dir: dir.path().join("custom_dl").to_string_lossy().into_owned(),
                max_concurrent: 99,
                naming_template: "{artist} - {title}".to_string(),
                auto_tag: true,
                auto_add_to_library: false,
            })
            .unwrap();
        assert_eq!(updated.max_concurrent, 4);
    }
}
