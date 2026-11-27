pub mod playlists;

use std::collections::HashSet;
use std::fs;
use std::path::Path;
use std::time::UNIX_EPOCH;

use walkdir::WalkDir;

use crate::database::models::ScanSummary;
use crate::database::Database;
use crate::error::AppError;
use crate::metadata::{extract_metadata, is_supported_audio_file};

pub fn scan_all_folders(db: &Database, artwork_dir: &Path) -> Result<ScanSummary, AppError> {
    let folders = db.list_folders()?;
    let mut summary = ScanSummary::default();

    for folder in folders {
        let root = Path::new(&folder.path);
        if !root.exists() {
            summary
                .errors
                .push(format!("Folder not found: {}", folder.path));
            continue;
        }

        let mut seen_paths = HashSet::new();

        let folder_id = folder.id;
        let folder_path = folder.path.clone();
        db.with_batch_transaction(|batch_db| {
            for entry in WalkDir::new(root).follow_links(false).into_iter().flatten() {
                if !entry.file_type().is_file() {
                    continue;
                }
                let path = entry.path();
                if !is_supported_audio_file(path) {
                    continue;
                }

                summary.scanned_files += 1;
                let path_str = path.to_string_lossy().into_owned();
                seen_paths.insert(path_str.clone());

                if let Ok(meta) = fs::metadata(path) {
                    let file_size = meta.len() as i64;
                    let modified_at = meta
                        .modified()
                        .ok()
                        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                        .map(|d| d.as_secs() as i64)
                        .unwrap_or(0);

                    if let Ok(Some((_, old_size, old_mod, is_missing))) =
                        batch_db.get_track_by_path_meta(&path_str)
                    {
                        if !is_missing && old_size == file_size && old_mod == modified_at {
                            continue;
                        }
                    }
                }

                match extract_metadata(path, artwork_dir) {
                    Ok(track_data) => match batch_db.upsert_track(&track_data) {
                        Ok(true) => summary.added += 1,
                        Ok(false) => summary.updated += 1,
                        Err(e) => summary.errors.push(format!("{path_str}: {e}")),
                    },
                    Err(e) => summary.errors.push(format!("{path_str}: {e}")),
                }
            }

            summary.missing += batch_db.mark_missing_under_folder(&folder_path, &seen_paths)?;
            batch_db.touch_folder_scanned(folder_id)?;
            Ok(())
        })?;
    }

    Ok(summary)
}

#[cfg(test)]
pub mod tests {
    use super::*;
    use tempfile::tempdir;

    pub fn write_test_wav(path: &Path, sample_rate: u32, num_samples: usize) {
        let mut bytes = Vec::with_capacity(44 + num_samples * 2);
        let data_len = (num_samples * 2) as u32;
        let byte_rate = sample_rate * 2;
        bytes.extend_from_slice(b"RIFF");
        bytes.extend_from_slice(&(36 + data_len).to_le_bytes());
        bytes.extend_from_slice(b"WAVEfmt ");
        bytes.extend_from_slice(&16u32.to_le_bytes());
        bytes.extend_from_slice(&1u16.to_le_bytes());
        bytes.extend_from_slice(&1u16.to_le_bytes());
        bytes.extend_from_slice(&sample_rate.to_le_bytes());
        bytes.extend_from_slice(&byte_rate.to_le_bytes());
        bytes.extend_from_slice(&2u16.to_le_bytes());
        bytes.extend_from_slice(&16u16.to_le_bytes());
        bytes.extend_from_slice(b"data");
        bytes.extend_from_slice(&data_len.to_le_bytes());
        for i in 0..num_samples {
            let t = i as f32 / sample_rate as f32;
            let sample = ((t * 440.0 * std::f32::consts::TAU).sin() * 12000.0) as i16;
            bytes.extend_from_slice(&sample.to_le_bytes());
        }
        fs::write(path, bytes).expect("write wav");
    }

    #[test]
    fn scans_wav_detects_addition_and_missing_file() {
        let dir = tempdir().unwrap();
        let art_dir = dir.path().join("artwork");
        let music_dir = dir.path().join("music");
        fs::create_dir_all(&music_dir).unwrap();

        let wav_path = music_dir.join("test_tone.wav");
        write_test_wav(&wav_path, 44100, 4410);

        let db = Database::open_in_memory().unwrap();
        db.add_folder(&music_dir.to_string_lossy()).unwrap();

        let first = scan_all_folders(&db, &art_dir).unwrap();
        assert_eq!(first.scanned_files, 1);
        assert_eq!(first.added, 1);
        assert_eq!(db.search_tracks("test_tone").unwrap().len(), 1);

        fs::remove_file(&wav_path).unwrap();
        let second = scan_all_folders(&db, &art_dir).unwrap();
        assert_eq!(second.missing, 1);
        assert_eq!(db.list_tracks(false, None).unwrap().len(), 0);
    }
}
