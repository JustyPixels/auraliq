use std::collections::HashSet;
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

use sha2::{Digest, Sha256};

use crate::database::models::{CacheEntryRecord, CacheSettings, CacheStats};
use crate::database::{now_unix_secs, Database};
use crate::error::AppError;
use crate::security::validation::validate_remote_url;

const HARD_MAX_ENTRY_BYTES: usize = 50 * 1024 * 1024;

#[derive(Clone)]
pub struct CacheManager {
    db: Arc<Mutex<Database>>,
    cache_dir: PathBuf,
    in_flight: Arc<Mutex<HashSet<String>>>,
}

impl CacheManager {
    pub fn new(db: Arc<Mutex<Database>>, cache_dir: PathBuf) -> Result<Self, AppError> {
        fs::create_dir_all(&cache_dir)?;
        let manager = Self {
            db,
            cache_dir,
            in_flight: Arc::new(Mutex::new(HashSet::new())),
        };
        let _ = manager.evict_expired_and_lru();
        Ok(manager)
    }

    pub fn cache_key(provider_id: &str, external_id: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(provider_id.as_bytes());
        hasher.update(b":");
        hasher.update(external_id.as_bytes());
        let digest = hasher.finalize();
        digest.iter().map(|b| format!("{b:02x}")).collect()
    }

    pub fn get_settings(&self) -> Result<CacheSettings, AppError> {
        let db = self
            .db
            .lock()
            .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
        db.get_cache_settings()
    }

    pub fn update_settings(&self, mut settings: CacheSettings) -> Result<CacheSettings, AppError> {
        settings.max_size_mb = settings.max_size_mb.clamp(32, 8192);
        settings.ttl_hours = settings.ttl_hours.clamp(1, 720);
        {
            let db = self
                .db
                .lock()
                .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
            db.save_cache_settings(&settings)?;
        }
        self.evict_expired_and_lru()?;
        Ok(settings)
    }

    pub fn get_stats(&self) -> Result<CacheStats, AppError> {
        let (settings, entries) = {
            let db = self
                .db
                .lock()
                .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
            (db.get_cache_settings()?, db.list_cache_entries()?)
        };
        let total_bytes: i64 = entries.iter().map(|e| e.size_bytes.max(0)).sum();
        Ok(CacheStats {
            entry_count: entries.len(),
            total_bytes,
            max_bytes: settings.max_size_mb * 1024 * 1024,
            enabled: settings.enabled,
            max_size_mb: settings.max_size_mb,
            ttl_hours: settings.ttl_hours,
            offline_mode: settings.offline_mode,
            cache_dir: self.cache_dir.to_string_lossy().into_owned(),
        })
    }

    pub fn list_entries(&self) -> Result<Vec<CacheEntryRecord>, AppError> {
        let db = self
            .db
            .lock()
            .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
        db.list_cache_entries()
    }

    pub fn lookup_valid(
        &self,
        provider_id: &str,
        external_id: &str,
    ) -> Result<Option<PathBuf>, AppError> {
        let key = Self::cache_key(provider_id, external_id);
        let (settings, entry_opt) = {
            let db = self
                .db
                .lock()
                .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
            (db.get_cache_settings()?, db.get_cache_entry(&key)?)
        };

        if !settings.enabled && !settings.offline_mode {
            return Ok(None);
        }

        let Some(entry) = entry_opt else {
            return Ok(None);
        };

        let now = now_unix_secs();
        let path = PathBuf::from(&entry.file_path);
        if entry.expires_at <= now || !path.is_file() {
            let _ = fs::remove_file(&path);
            let db = self
                .db
                .lock()
                .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
            db.delete_cache_entry(&key)?;
            return Ok(None);
        }

        let new_expires = now + settings.ttl_hours * 3600;
        let db = self
            .db
            .lock()
            .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
        db.touch_cache_entry(&key, new_expires)?;
        Ok(Some(path))
    }

    pub fn store_file_bytes(
        &self,
        provider_id: &str,
        external_id: &str,
        title: &str,
        artist: &str,
        ext: &str,
        bytes: &[u8],
    ) -> Result<PathBuf, AppError> {
        if bytes.is_empty() {
            return Err(AppError::Io("Cannot cache empty audio payload".to_string()));
        }

        let settings = self.get_settings()?;
        let max_bytes = (settings.max_size_mb.max(32) as usize) * 1024 * 1024;
        if bytes.len() > max_bytes || bytes.len() > HARD_MAX_ENTRY_BYTES {
            return Err(AppError::Io(
                "Stream exceeds temporary cache size limit".to_string(),
            ));
        }

        fs::create_dir_all(&self.cache_dir)?;
        let key = Self::cache_key(provider_id, external_id);
        let safe_ext = sanitize_audio_ext(ext);
        let tmp_path = self.cache_dir.join(format!("{key}.tmp"));
        let final_path = self.cache_dir.join(format!("{key}.{safe_ext}"));

        fs::write(&tmp_path, bytes)?;
        if final_path.exists() {
            let _ = fs::remove_file(&final_path);
        }
        fs::rename(&tmp_path, &final_path)?;

        let now = now_unix_secs();
        let entry = CacheEntryRecord {
            cache_key: key,
            provider_id: provider_id.to_string(),
            external_id: external_id.to_string(),
            title: title.to_string(),
            artist: artist.to_string(),
            file_path: final_path.to_string_lossy().into_owned(),
            size_bytes: bytes.len() as i64,
            created_at: now,
            last_accessed_at: now,
            expires_at: now + settings.ttl_hours * 3600,
        };

        {
            let db = self
                .db
                .lock()
                .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
            db.upsert_cache_entry(&entry)?;
        }
        self.evict_expired_and_lru()?;
        Ok(final_path)
    }

    pub fn spawn_background_cache_url(
        &self,
        provider_id: String,
        external_id: String,
        title: String,
        artist: String,
        url: String,
    ) {
        let key = Self::cache_key(&provider_id, &external_id);
        if let Ok(mut guard) = self.in_flight.lock() {
            if !guard.insert(key.clone()) {
                return;
            }
        } else {
            return;
        }

        let manager = self.clone();
        thread::spawn(move || {
            let _cleanup = InFlightGuard {
                key: key.clone(),
                in_flight: Arc::clone(&manager.in_flight),
            };

            let Ok(settings) = manager.get_settings() else {
                return;
            };
            if !settings.enabled || settings.offline_mode {
                return;
            }
            if matches!(
                manager.lookup_valid(&provider_id, &external_id),
                Ok(Some(_))
            ) {
                return;
            }

            let Ok(parsed) = validate_remote_url(&url, true) else {
                return;
            };
            let Ok(client) = reqwest::blocking::Client::builder()
                .user_agent("Auraliq/0.6.0 (https://github.com/JustyPixels/auraliq)")
                .timeout(Duration::from_secs(45))
                .build()
            else {
                return;
            };

            let Ok(mut resp) = client.get(parsed.clone()).send() else {
                return;
            };
            if !resp.status().is_success() {
                return;
            }
            if validate_remote_url(resp.url().as_str(), true).is_err() {
                return;
            }

            let cap =
                ((settings.max_size_mb.max(32) as usize) * 1024 * 1024).min(HARD_MAX_ENTRY_BYTES);
            if let Some(len) = resp.content_length() {
                if len as usize > cap {
                    return;
                }
            }

            let ext = Path::new(resp.url().path())
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("mp3")
                .to_string();

            let mut buf = Vec::new();
            let mut chunk = [0u8; 32 * 1024];
            loop {
                match resp.read(&mut chunk) {
                    Ok(0) => break,
                    Ok(n) => {
                        if buf.len() + n > cap {
                            return;
                        }
                        buf.extend_from_slice(&chunk[..n]);
                    }
                    Err(_) => return,
                }
            }

            let _ =
                manager.store_file_bytes(&provider_id, &external_id, &title, &artist, &ext, &buf);
        });
    }

    pub fn evict_expired_and_lru(&self) -> Result<usize, AppError> {
        let now = now_unix_secs();
        let (settings, mut entries) = {
            let db = self
                .db
                .lock()
                .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
            (db.get_cache_settings()?, db.list_cache_entries()?)
        };

        let mut removed = 0usize;
        let mut kept: Vec<CacheEntryRecord> = Vec::new();

        for entry in entries.drain(..) {
            let path = PathBuf::from(&entry.file_path);
            if entry.expires_at <= now || !path.is_file() {
                let _ = fs::remove_file(&path);
                let db = self
                    .db
                    .lock()
                    .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
                db.delete_cache_entry(&entry.cache_key)?;
                removed += 1;
            } else {
                kept.push(entry);
            }
        }

        // list_cache_entries() is ordered by last_accessed_at DESC; pop oldest from the back
        let max_bytes = settings.max_size_mb.max(32) * 1024 * 1024;
        let mut total_bytes: i64 = kept.iter().map(|e| e.size_bytes.max(0)).sum();
        while total_bytes > max_bytes {
            let Some(oldest) = kept.pop() else {
                break;
            };
            let _ = fs::remove_file(&oldest.file_path);
            let db = self
                .db
                .lock()
                .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
            db.delete_cache_entry(&oldest.cache_key)?;
            total_bytes -= oldest.size_bytes.max(0);
            removed += 1;
        }

        // Remove any orphaned files in cache_dir not present in DB
        let tracked_paths: HashSet<PathBuf> =
            kept.iter().map(|e| PathBuf::from(&e.file_path)).collect();
        if let Ok(read_dir) = fs::read_dir(&self.cache_dir) {
            for item in read_dir.flatten() {
                let path = item.path();
                if path.is_file() && !tracked_paths.contains(&path) {
                    let _ = fs::remove_file(path);
                }
            }
        }

        Ok(removed)
    }

    pub fn remove_entry(&self, cache_key: &str) -> Result<(), AppError> {
        let entry = {
            let db = self
                .db
                .lock()
                .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
            let found = db.get_cache_entry(cache_key)?;
            db.delete_cache_entry(cache_key)?;
            found
        };
        if let Some(record) = entry {
            let _ = fs::remove_file(record.file_path);
        }
        Ok(())
    }

    pub fn clear_all(&self) -> Result<usize, AppError> {
        let entries = {
            let db = self
                .db
                .lock()
                .map_err(|_| AppError::Internal("Database lock poisoned".to_string()))?;
            let list = db.list_cache_entries()?;
            db.clear_cache_entries()?;
            list
        };
        let count = entries.len();
        for entry in entries {
            let _ = fs::remove_file(entry.file_path);
        }
        if let Ok(read_dir) = fs::read_dir(&self.cache_dir) {
            for item in read_dir.flatten() {
                if item.path().is_file() {
                    let _ = fs::remove_file(item.path());
                }
            }
        }
        Ok(count)
    }
}

struct InFlightGuard {
    key: String,
    in_flight: Arc<Mutex<HashSet<String>>>,
}

impl Drop for InFlightGuard {
    fn drop(&mut self) {
        if let Ok(mut guard) = self.in_flight.lock() {
            guard.remove(&self.key);
        }
    }
}

fn sanitize_audio_ext(ext: &str) -> &'static str {
    match ext
        .trim()
        .trim_start_matches('.')
        .to_ascii_lowercase()
        .as_str()
    {
        "flac" => "flac",
        "ogg" | "oga" => "ogg",
        "opus" => "opus",
        "m4a" | "mp4" => "m4a",
        "wav" => "wav",
        _ => "mp3",
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn stores_hits_and_clears_cache_entries() {
        let dir = tempdir().unwrap();
        let db = Arc::new(Mutex::new(Database::open_in_memory().unwrap()));
        let cache = CacheManager::new(Arc::clone(&db), dir.path().to_path_buf()).unwrap();

        let key1 = CacheManager::cache_key("audius", "track-1");
        let key2 = CacheManager::cache_key("audius", "track-1");
        assert_eq!(key1, key2);

        let path = cache
            .store_file_bytes(
                "audius",
                "track-1",
                "Neon Drift",
                "Artist",
                "mp3",
                &[1, 2, 3, 4],
            )
            .unwrap();
        assert!(path.is_file());

        let hit = cache.lookup_valid("audius", "track-1").unwrap();
        assert_eq!(hit, Some(path.clone()));

        let cleared = cache.clear_all().unwrap();
        assert_eq!(cleared, 1);
        assert!(!path.exists());
        assert_eq!(cache.list_entries().unwrap().len(), 0);
    }

    #[test]
    fn evicts_expired_and_lru_entries() {
        let dir = tempdir().unwrap();
        let db = Arc::new(Mutex::new(Database::open_in_memory().unwrap()));
        let cache = CacheManager::new(Arc::clone(&db), dir.path().to_path_buf()).unwrap();

        let expired_file = dir.path().join("expired.mp3");
        fs::write(&expired_file, [9u8; 64]).unwrap();
        {
            let guard = db.lock().unwrap();
            guard
                .upsert_cache_entry(&CacheEntryRecord {
                    cache_key: "expired-key".into(),
                    provider_id: "audius".into(),
                    external_id: "old".into(),
                    title: "Old".into(),
                    artist: "A".into(),
                    file_path: expired_file.to_string_lossy().into_owned(),
                    size_bytes: 64,
                    created_at: 1,
                    last_accessed_at: 1,
                    expires_at: 2,
                })
                .unwrap();
        }

        let evicted = cache.evict_expired_and_lru().unwrap();
        assert_eq!(evicted, 1);
        assert!(!expired_file.exists());

        // Test LRU ordering when total_bytes > max_bytes (32 MB min cap)
        let f1 = dir.path().join("f1.mp3");
        let f2 = dir.path().join("f2.mp3");
        fs::write(&f1, [1u8; 10]).unwrap();
        fs::write(&f2, [2u8; 10]).unwrap();
        let future = now_unix_secs() + 3600;
        {
            let guard = db.lock().unwrap();
            guard
                .upsert_cache_entry(&CacheEntryRecord {
                    cache_key: "k1".into(),
                    provider_id: "audius".into(),
                    external_id: "1".into(),
                    title: "Older".into(),
                    artist: "A".into(),
                    file_path: f1.to_string_lossy().into_owned(),
                    size_bytes: 20 * 1024 * 1024,
                    created_at: 10,
                    last_accessed_at: 10,
                    expires_at: future,
                })
                .unwrap();
            guard
                .upsert_cache_entry(&CacheEntryRecord {
                    cache_key: "k2".into(),
                    provider_id: "audius".into(),
                    external_id: "2".into(),
                    title: "Newer".into(),
                    artist: "B".into(),
                    file_path: f2.to_string_lossy().into_owned(),
                    size_bytes: 20 * 1024 * 1024,
                    created_at: 20,
                    last_accessed_at: 20,
                    expires_at: future,
                })
                .unwrap();
        }

        // Default 512MB keeps both; lowering to 32MB evicts k1 (40MB > 32MB)
        cache
            .update_settings(CacheSettings {
                enabled: true,
                max_size_mb: 32,
                ttl_hours: 72,
                offline_mode: false,
            })
            .unwrap();
        let remaining = cache.list_entries().unwrap();
        assert_eq!(remaining.len(), 1);
        assert_eq!(remaining[0].cache_key, "k2");
        assert!(!f1.exists());
        assert!(f2.is_file());
    }
}
