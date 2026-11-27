use std::fs;
use std::path::Path;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::error::AppError;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SyncedLyricLine {
    pub time_ms: u64,
    pub text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LyricsResult {
    pub source: String,
    pub instrumental: bool,
    pub plain_lyrics: Option<String>,
    pub synced_lines: Vec<SyncedLyricLine>,
    pub lrclib_enabled: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LrclibPayload {
    pub instrumental: Option<bool>,
    pub plain_lyrics: Option<String>,
    pub synced_lyrics: Option<String>,
}

pub fn lyrics_cache_key(title: &str, artist: &str, album: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(title.trim().to_ascii_lowercase().as_bytes());
    hasher.update(b"|");
    hasher.update(artist.trim().to_ascii_lowercase().as_bytes());
    hasher.update(b"|");
    hasher.update(album.trim().to_ascii_lowercase().as_bytes());
    let digest = hasher.finalize();
    digest.iter().map(|b| format!("{b:02x}")).collect()
}

pub fn load_sidecar_lrc(audio_path: &Path) -> Option<String> {
    let lrc_path = audio_path.with_extension("lrc");
    if lrc_path.is_file() {
        fs::read_to_string(lrc_path).ok()
    } else {
        None
    }
}

pub fn parse_synced_lrc(raw: &str) -> Vec<SyncedLyricLine> {
    let mut lines = Vec::new();

    for raw_line in raw.lines() {
        let mut rest = raw_line.trim();
        let mut timestamps: Vec<u64> = Vec::new();

        while rest.starts_with('[') {
            let Some(close_idx) = rest.find(']') else {
                break;
            };
            let tag = &rest[1..close_idx];
            if let Some(ms) = parse_lrc_timestamp(tag) {
                timestamps.push(ms);
                rest = rest[close_idx + 1..].trim_start();
            } else {
                break;
            }
        }

        if !timestamps.is_empty() {
            let text = rest.trim().to_string();
            for time_ms in timestamps {
                lines.push(SyncedLyricLine {
                    time_ms,
                    text: text.clone(),
                });
            }
        }
    }

    lines.sort_by_key(|l| l.time_ms);
    lines
}

fn parse_lrc_timestamp(tag: &str) -> Option<u64> {
    let (min_str, sec_part) = tag.trim().split_once(':')?;
    let mins: u64 = min_str.parse().ok()?;
    let (sec_str, frac_ms) = match sec_part.split_once('.') {
        Some((s, f)) => {
            let clean: String = f.chars().take(3).collect();
            let frac = match clean.len() {
                0 => 0,
                1 => clean.parse::<u64>().ok()? * 100,
                2 => clean.parse::<u64>().ok()? * 10,
                _ => clean.parse::<u64>().ok()?,
            };
            (s, frac)
        }
        None => (sec_part, 0),
    };
    let secs: u64 = sec_str.parse().ok()?;
    Some(mins * 60_000 + secs * 1000 + frac_ms)
}

pub fn parse_lrclib_response(raw_json: &str) -> Result<LrclibPayload, AppError> {
    serde_json::from_str(raw_json).map_err(|e| AppError::Provider(format!("LRCLIB JSON: {e}")))
}

pub async fn fetch_lrclib_lyrics(
    title: &str,
    artist: &str,
    album: &str,
    duration_sec: i64,
) -> Result<Option<LrclibPayload>, AppError> {
    let client = reqwest::Client::builder()
        .user_agent("Auraliq/0.8.0 (https://github.com/JustyPixels/auraliq)")
        .timeout(Duration::from_secs(12))
        .build()
        .map_err(|e| AppError::Provider(e.to_string()))?;

    let mut params = vec![
        ("track_name", title.trim().to_string()),
        ("artist_name", artist.trim().to_string()),
    ];
    if !album.trim().is_empty() && album.trim() != "Unknown Album" {
        params.push(("album_name", album.trim().to_string()));
    }
    if duration_sec > 0 {
        params.push(("duration", duration_sec.to_string()));
    }

    let resp = client
        .get("https://lrclib.net/api/get")
        .query(&params)
        .send()
        .await
        .map_err(|e| AppError::Provider(format!("LRCLIB request failed: {e}")))?;

    if resp.status().as_u16() == 404 {
        return Ok(None);
    }
    if !resp.status().is_success() {
        return Err(AppError::Provider(format!(
            "LRCLIB returned HTTP {}",
            resp.status()
        )));
    }

    let body = resp
        .text()
        .await
        .map_err(|e| AppError::Provider(e.to_string()))?;
    parse_lrclib_response(&body).map(Some)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn parses_synced_lrc_timestamps_and_multi_tags() {
        let lrc = "[00:12.50]First line\n[00:05.10][00:25.000]Chorus line\n[ar:Artist]";
        let parsed = parse_synced_lrc(lrc);
        assert_eq!(parsed.len(), 3);
        assert_eq!(parsed[0].time_ms, 5_100);
        assert_eq!(parsed[0].text, "Chorus line");
        assert_eq!(parsed[1].time_ms, 12_500);
        assert_eq!(parsed[2].time_ms, 25_000);
    }

    #[test]
    fn parses_lrclib_json_fixture() {
        let fixture = r#"{
            "instrumental": false,
            "plainLyrics": "Hello world",
            "syncedLyrics": "[00:01.00]Hello world"
        }"#;
        let payload = parse_lrclib_response(fixture).unwrap();
        assert_eq!(payload.instrumental, Some(false));
        assert_eq!(payload.plain_lyrics.as_deref(), Some("Hello world"));
        assert!(payload.synced_lyrics.is_some());
    }

    #[test]
    fn loads_local_sidecar_lrc_file() {
        let dir = tempdir().unwrap();
        let audio = dir.path().join("track.flac");
        let lrc = dir.path().join("track.lrc");
        fs::write(&audio, b"audio").unwrap();
        fs::write(&lrc, "[00:02.00]Sidecar line").unwrap();

        let loaded = load_sidecar_lrc(&audio).unwrap();
        assert!(loaded.contains("Sidecar line"));
    }
}
