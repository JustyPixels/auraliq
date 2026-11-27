pub mod identity;

use std::fs;
use std::path::Path;
use std::time::UNIX_EPOCH;

use lofty::config::WriteOptions;
use lofty::file::{AudioFile, TaggedFileExt};
use lofty::picture::{MimeType, PictureType};
use lofty::probe::read_from_path;
use lofty::tag::{Accessor, ItemKey, Tag, TagExt};
use sha2::{Digest, Sha256};

use crate::database::models::NewTrackData;
use crate::error::AppError;

pub const SUPPORTED_AUDIO_EXTENSIONS: &[&str] = &[
    "mp3", "flac", "wav", "m4a", "aac", "ogg", "oga", "opus", "alac", "mp4",
];

const EXTERNAL_COVER_NAMES: &[&str] = &[
    "cover.jpg",
    "cover.jpeg",
    "cover.png",
    "cover.webp",
    "folder.jpg",
    "folder.jpeg",
    "folder.png",
    "front.jpg",
    "front.png",
    "album.jpg",
    "album.png",
];

pub fn is_supported_audio_file(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| SUPPORTED_AUDIO_EXTENSIONS.contains(&ext.to_ascii_lowercase().as_str()))
        .unwrap_or(false)
}

fn cache_artwork_bytes(bytes: &[u8], ext: &str, artwork_dir: &Path) -> Result<String, AppError> {
    fs::create_dir_all(artwork_dir)?;
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    let digest = hasher.finalize();
    let hex_prefix: String = digest.iter().take(8).map(|b| format!("{b:02x}")).collect();
    let target = artwork_dir.join(format!("{hex_prefix}.{ext}"));
    if !target.exists() {
        fs::write(&target, bytes)?;
    }
    Ok(target.to_string_lossy().into_owned())
}

fn mime_to_ext(mime: Option<&MimeType>) -> &'static str {
    match mime {
        Some(MimeType::Png) => "png",
        Some(MimeType::Gif) => "gif",
        Some(MimeType::Bmp) => "bmp",
        Some(MimeType::Tiff) => "tiff",
        Some(MimeType::Unknown(raw)) if raw.to_ascii_lowercase().contains("webp") => "webp",
        _ => "jpg",
    }
}

fn find_external_artwork(audio_path: &Path, artwork_dir: &Path) -> Option<String> {
    let parent = audio_path.parent()?;
    for name in EXTERNAL_COVER_NAMES {
        let candidate = parent.join(name);
        if candidate.is_file() {
            if let Ok(bytes) = fs::read(&candidate) {
                let ext = candidate
                    .extension()
                    .and_then(|e| e.to_str())
                    .unwrap_or("jpg");
                if let Ok(cached) = cache_artwork_bytes(&bytes, ext, artwork_dir) {
                    return Some(cached);
                }
            }
        }
    }
    None
}

pub fn extract_metadata(path: &Path, artwork_dir: &Path) -> Result<NewTrackData, AppError> {
    let meta = fs::metadata(path)?;
    let file_size = meta.len() as i64;
    let modified_at = meta
        .modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);

    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("unknown")
        .to_ascii_lowercase();

    let fallback_title = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Unknown Track")
        .to_string();

    let tagged_file = read_from_path(path).map_err(|e| AppError::Metadata(e.to_string()))?;
    let properties = tagged_file.properties();
    let duration_ms = properties.duration().as_millis() as i64;
    let bitrate_kbps = properties.audio_bitrate().map(i64::from);
    let sample_rate_hz = properties.sample_rate().map(i64::from);

    let tag = tagged_file
        .primary_tag()
        .or_else(|| tagged_file.first_tag());

    let title = tag
        .and_then(|t| t.title().map(|s| s.into_owned()))
        .filter(|s| !s.trim().is_empty())
        .unwrap_or(fallback_title);

    let artist = tag
        .and_then(|t| t.artist().map(|s| s.into_owned()))
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| "Unknown Artist".to_string());

    let album = tag
        .and_then(|t| t.album().map(|s| s.into_owned()))
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| "Unknown Album".to_string());

    let genre = tag
        .and_then(|t| t.genre().map(|s| s.into_owned()))
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| "Unknown Genre".to_string());

    let track_number = tag.and_then(|t| t.track().map(i64::from));
    let disc_number = tag.and_then(|t| t.disk().map(i64::from));
    let release_year = tag.and_then(|t| t.date().map(|d| i64::from(d.year)));

    let artwork_path = tag
        .and_then(|t| {
            let pics = t.pictures();
            let chosen = pics
                .iter()
                .find(|p| p.pic_type() == PictureType::CoverFront)
                .or_else(|| pics.first())?;
            cache_artwork_bytes(chosen.data(), mime_to_ext(chosen.mime_type()), artwork_dir).ok()
        })
        .or_else(|| find_external_artwork(path, artwork_dir));

    Ok(NewTrackData {
        source_provider: "local".to_string(),
        file_path: path.to_string_lossy().into_owned(),
        title,
        artist: artist.clone(),
        album,
        album_artist: artist,
        genre,
        duration_ms,
        track_number,
        disc_number,
        release_year,
        format: ext,
        bitrate_kbps,
        sample_rate_hz,
        artwork_path,
        file_size,
        modified_at,
    })
}

pub fn write_track_tags(
    path: &Path,
    title: &str,
    artist: &str,
    album: &str,
    license: Option<&str>,
) -> Result<(), AppError> {
    let mut tagged_file = read_from_path(path).map_err(|e| AppError::Metadata(e.to_string()))?;
    let tag_type = tagged_file.primary_tag_type();
    if tagged_file.primary_tag().is_none() {
        tagged_file.insert_tag(Tag::new(tag_type));
    }
    if let Some(tag) = tagged_file.primary_tag_mut() {
        tag.set_title(title.to_string());
        tag.set_artist(artist.to_string());
        tag.set_album(album.to_string());
        if let Some(lic) = license.filter(|l| !l.trim().is_empty()) {
            tag.set_comment(format!("License: {lic}"));
        }
        tag.save_to_path(path, WriteOptions::default())
            .map_err(|e| AppError::Metadata(e.to_string()))?;
    }
    Ok(())
}

pub fn read_replay_gain_db(path: &Path) -> Option<f32> {
    let tagged_file = read_from_path(path).ok()?;
    for tag in tagged_file.tags() {
        for key in [ItemKey::ReplayGainTrackGain, ItemKey::ReplayGainAlbumGain] {
            if let Some(val) = tag.get_string(key) {
                if let Some(db) = crate::audio::dsp::parse_replay_gain_db(val) {
                    return Some(db);
                }
            }
        }
    }
    None
}
