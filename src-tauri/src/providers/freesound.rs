use std::collections::HashMap;
use std::time::Duration;

use async_trait::async_trait;
use serde::Deserialize;

use crate::error::AppError;
use crate::providers::types::{OnlineTrack, ProviderAuthField, ProviderCapabilities};
use crate::providers::MusicProvider;
use crate::security::credentials::CredentialStore;

pub struct FreesoundProvider;

#[derive(Debug, Deserialize)]
struct FreesoundResp {
    results: Vec<FreesoundItem>,
}

#[derive(Debug, Deserialize)]
struct FreesoundItem {
    id: u64,
    name: String,
    username: Option<String>,
    duration: Option<f64>,
    previews: Option<HashMap<String, String>>,
    license: Option<String>,
    url: Option<String>,
}

pub fn parse_freesound_tracks(raw_json: &str) -> Result<Vec<OnlineTrack>, AppError> {
    let parsed: FreesoundResp = serde_json::from_str(raw_json)
        .map_err(|e| AppError::Provider(format!("Freesound JSON: {e}")))?;

    let tracks = parsed
        .results
        .into_iter()
        .map(|item| {
            let stream_url = item.previews.and_then(|map| {
                map.get("preview-hq-mp3")
                    .or_else(|| map.get("preview-lq-mp3"))
                    .cloned()
            });

            OnlineTrack {
                provider_id: "freesound".to_string(),
                external_id: item.id.to_string(),
                title: item.name,
                artist: item
                    .username
                    .unwrap_or_else(|| "Freesound Creator".to_string()),
                album: "Freesound CC Audio".to_string(),
                duration_ms: (item.duration.unwrap_or(0.0) * 1000.0) as i64,
                stream_url,
                artwork_url: None,
                external_url: item.url,
                license: item.license,
                downloadable: false,
            }
        })
        .collect();

    Ok(tracks)
}

#[async_trait]
impl MusicProvider for FreesoundProvider {
    fn id(&self) -> &'static str {
        "freesound"
    }
    fn name(&self) -> &'static str {
        "Freesound"
    }
    fn tier(&self) -> &'static str {
        "Tier 2B — BYOK Open Catalog"
    }
    fn status_label(&self) -> &'static str {
        "Live (BYOK API Key)"
    }
    fn description(&self) -> &'static str {
        "500,000+ Creative Commons ambient loops, synth stems, and field recordings."
    }
    fn restriction_note(&self) -> &'static str {
        "Requires your free Freesound APIv2 key; streams high-quality MP3 previews."
    }
    fn auth_help(&self) -> Option<&'static str> {
        Some("Register a free API key at freesound.org/apiv2/apply.")
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
            download: false,
            offline_cache_allowed: true,
            lyrics: false,
            requires_auth: true,
        }
    }
    fn auth_fields(&self) -> Vec<ProviderAuthField> {
        vec![ProviderAuthField {
            key: "api_key".to_string(),
            label: "Freesound API Key".to_string(),
            is_secret: true,
        }]
    }

    async fn search(&self, query: &str, limit: usize) -> Result<Vec<OnlineTrack>, AppError> {
        let api_key = CredentialStore::get_secret("freesound", "api_key")?.ok_or_else(|| {
            AppError::Provider(
                "Add your free Freesound API Key in Settings -> Providers to search Freesound."
                    .to_string(),
            )
        })?;

        let client = reqwest::Client::builder()
            .user_agent("Auraliq/0.5.0 (https://github.com/JustyPixels/auraliq)")
            .timeout(Duration::from_secs(15))
            .build()
            .map_err(|e| AppError::Provider(e.to_string()))?;

        let q = if query.trim().is_empty() {
            "ambient synth"
        } else {
            query.trim()
        };

        let resp = client
            .get("https://freesound.org/apiv2/search/text/")
            .query(&[
                ("query", q),
                ("fields", "id,name,username,duration,previews,license,url"),
                ("page_size", &limit.to_string()),
                ("token", &api_key),
            ])
            .send()
            .await
            .map_err(|e| AppError::Provider(format!("Freesound request failed: {e}")))?;

        if !resp.status().is_success() {
            return Err(AppError::Provider(format!(
                "Freesound returned HTTP {}",
                resp.status()
            )));
        }

        let body = resp
            .text()
            .await
            .map_err(|e| AppError::Provider(e.to_string()))?;
        parse_freesound_tracks(&body)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_freesound_fixture() {
        let fixture = r#"{
            "results": [{
                "id": 777,
                "name": "Analog Pad",
                "username": "synthlab",
                "duration": 42.5,
                "previews": { "preview-hq-mp3": "https://cdn.freesound.org/777-hq.mp3" },
                "license": "https://creativecommons.org/publicdomain/zero/1.0/",
                "url": "https://freesound.org/s/777/"
            }]
        }"#;
        let tracks = parse_freesound_tracks(fixture).unwrap();
        assert_eq!(tracks.len(), 1);
        assert_eq!(tracks[0].duration_ms, 42_500);
        assert_eq!(
            tracks[0].stream_url.as_deref(),
            Some("https://cdn.freesound.org/777-hq.mp3")
        );
    }
}
