use std::time::Duration;

use async_trait::async_trait;
use serde::Deserialize;

use crate::error::AppError;
use crate::providers::types::{OnlineTrack, ProviderAuthField, ProviderCapabilities};
use crate::providers::MusicProvider;

pub struct InternetArchiveProvider;

#[derive(Debug, Deserialize)]
struct ArchiveSearchResp {
    response: ArchiveResponseBody,
}

#[derive(Debug, Deserialize)]
struct ArchiveResponseBody {
    docs: Vec<ArchiveDoc>,
}

#[derive(Debug, Deserialize)]
struct ArchiveDoc {
    identifier: String,
    title: Option<String>,
    creator: Option<serde_json::Value>,
    licenseurl: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ArchiveFilesResp {
    result: Vec<ArchiveFileEntry>,
}

#[derive(Debug, Deserialize)]
pub struct ArchiveFileEntry {
    pub name: String,
    pub format: Option<String>,
}

fn extract_creator(val: Option<serde_json::Value>) -> String {
    match val {
        Some(serde_json::Value::String(s)) => s,
        Some(serde_json::Value::Array(arr)) => arr
            .first()
            .and_then(|v| v.as_str())
            .unwrap_or("Internet Archive")
            .to_string(),
        _ => "Internet Archive".to_string(),
    }
}

pub fn parse_archive_search(raw_json: &str) -> Result<Vec<OnlineTrack>, AppError> {
    let parsed: ArchiveSearchResp = serde_json::from_str(raw_json)
        .map_err(|e| AppError::Provider(format!("Internet Archive JSON: {e}")))?;

    let tracks = parsed
        .response
        .docs
        .into_iter()
        .map(|doc| {
            let id = doc.identifier.clone();
            OnlineTrack {
                provider_id: "internet_archive".to_string(),
                external_id: id.clone(),
                title: doc.title.unwrap_or_else(|| id.clone()),
                artist: extract_creator(doc.creator),
                album: "Internet Archive Audio".to_string(),
                duration_ms: 0,
                stream_url: None,
                artwork_url: Some(format!("https://archive.org/services/img/{id}")),
                external_url: Some(format!("https://archive.org/details/{id}")),
                license: doc.licenseurl,
                downloadable: true,
            }
        })
        .collect();

    Ok(tracks)
}

pub fn pick_archive_audio_file(files: &[ArchiveFileEntry]) -> Option<String> {
    for ext in [".mp3", ".ogg", ".flac", ".m4a"] {
        if let Some(found) = files
            .iter()
            .find(|f| f.name.to_ascii_lowercase().ends_with(ext))
        {
            return Some(found.name.clone());
        }
    }
    None
}

#[async_trait]
impl MusicProvider for InternetArchiveProvider {
    fn id(&self) -> &'static str {
        "internet_archive"
    }
    fn name(&self) -> &'static str {
        "Internet Archive"
    }
    fn tier(&self) -> &'static str {
        "Tier 2 — MVP Online"
    }
    fn status_label(&self) -> &'static str {
        "Live (Open Archive)"
    }
    fn description(&self) -> &'static str {
        "Open archival audio catalog with free streaming and permitted MP3/FLAC/OGG downloads."
    }
    fn restriction_note(&self) -> &'static str {
        "Respects item licenses and polite API rate limits."
    }
    fn auth_help(&self) -> Option<&'static str> {
        None
    }
    fn default_enabled(&self) -> bool {
        true
    }
    fn implemented_for_streaming(&self) -> bool {
        true
    }
    fn capabilities(&self) -> ProviderCapabilities {
        ProviderCapabilities {
            search: true,
            metadata: true,
            stream_playback: true,
            external_playback_only: false,
            playback_control: true,
            playlists: false,
            download: true,
            offline_cache_allowed: true,
            lyrics: false,
            requires_auth: false,
        }
    }
    fn auth_fields(&self) -> Vec<ProviderAuthField> {
        vec![]
    }

    async fn search(&self, query: &str, limit: usize) -> Result<Vec<OnlineTrack>, AppError> {
        let client = reqwest::Client::builder()
            .user_agent("Auraliq/0.5.0 (https://github.com/JustyPixels/auraliq)")
            .timeout(Duration::from_secs(15))
            .build()
            .map_err(|e| AppError::Provider(e.to_string()))?;

        let trimmed = query.trim();
        let lucene = if trimmed.is_empty() {
            "collection:opensource_audio AND mediatype:audio".to_string()
        } else {
            format!("({trimmed}) AND mediatype:audio")
        };

        let resp = client
            .get("https://archive.org/advancedsearch.php")
            .query(&[
                ("q", lucene.as_str()),
                ("fl[]", "identifier"),
                ("fl[]", "title"),
                ("fl[]", "creator"),
                ("fl[]", "licenseurl"),
                ("rows", &limit.to_string()),
                ("output", "json"),
            ])
            .send()
            .await
            .map_err(|e| AppError::Provider(format!("Internet Archive request failed: {e}")))?;

        if !resp.status().is_success() {
            return Err(AppError::Provider(format!(
                "Internet Archive returned HTTP {}",
                resp.status()
            )));
        }

        let body = resp
            .text()
            .await
            .map_err(|e| AppError::Provider(e.to_string()))?;
        parse_archive_search(&body)
    }

    async fn resolve_stream(&self, external_id: &str) -> Result<String, AppError> {
        let client = reqwest::Client::builder()
            .user_agent("Auraliq/0.5.0 (https://github.com/JustyPixels/auraliq)")
            .timeout(Duration::from_secs(15))
            .build()
            .map_err(|e| AppError::Provider(e.to_string()))?;

        let url = format!("https://archive.org/metadata/{external_id}/files");
        let resp = client
            .get(&url)
            .send()
            .await
            .map_err(|e| AppError::Provider(format!("Archive metadata failed: {e}")))?;

        if !resp.status().is_success() {
            return Err(AppError::Provider(format!(
                "Archive metadata returned HTTP {}",
                resp.status()
            )));
        }

        let parsed: ArchiveFilesResp = resp
            .json()
            .await
            .map_err(|e| AppError::Provider(format!("Archive files JSON: {e}")))?;

        let filename = pick_archive_audio_file(&parsed.result).ok_or_else(|| {
            AppError::UnsupportedFormat("No playable MP3/OGG/FLAC file in archive item".to_string())
        })?;

        let encoded = filename.replace(' ', "%20");
        Ok(format!(
            "https://archive.org/download/{external_id}/{encoded}"
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_archive_search_and_picks_playable_file() {
        let fixture = r#"{
            "response": {
                "docs": [{
                    "identifier": "synth_demo_2026",
                    "title": "Retro Demo",
                    "creator": ["Archive Artist"],
                    "licenseurl": "https://creativecommons.org/licenses/by/4.0/"
                }]
            }
        }"#;
        let tracks = parse_archive_search(fixture).unwrap();
        assert_eq!(tracks.len(), 1);
        assert!(tracks[0].downloadable);
        assert_eq!(tracks[0].artist, "Archive Artist");

        let files = vec![
            ArchiveFileEntry {
                name: "meta.xml".into(),
                format: None,
            },
            ArchiveFileEntry {
                name: "track01.flac".into(),
                format: None,
            },
            ArchiveFileEntry {
                name: "track01.mp3".into(),
                format: None,
            },
        ];
        assert_eq!(
            pick_archive_audio_file(&files).as_deref(),
            Some("track01.mp3")
        );
    }
}
