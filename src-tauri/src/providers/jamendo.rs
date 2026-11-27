use std::time::Duration;

use async_trait::async_trait;
use serde::Deserialize;

use crate::error::AppError;
use crate::providers::types::{OnlineTrack, ProviderAuthField, ProviderCapabilities};
use crate::providers::MusicProvider;
use crate::security::credentials::CredentialStore;

pub struct JamendoProvider;

#[derive(Debug, Deserialize)]
struct JamendoResp {
    results: Vec<JamendoTrack>,
}

#[derive(Debug, Deserialize)]
struct JamendoTrack {
    id: String,
    name: String,
    duration: Option<i64>,
    artist_name: Option<String>,
    album_name: Option<String>,
    album_image: Option<String>,
    audio: Option<String>,
    audiodownload_allowed: Option<bool>,
    license_ccurl: Option<String>,
    shareurl: Option<String>,
}

pub fn parse_jamendo_tracks(raw_json: &str) -> Result<Vec<OnlineTrack>, AppError> {
    let parsed: JamendoResp = serde_json::from_str(raw_json)
        .map_err(|e| AppError::Provider(format!("Jamendo JSON: {e}")))?;

    let tracks = parsed
        .results
        .into_iter()
        .map(|item| OnlineTrack {
            provider_id: "jamendo".to_string(),
            external_id: item.id,
            title: item.name,
            artist: item
                .artist_name
                .unwrap_or_else(|| "Jamendo Artist".to_string()),
            album: item.album_name.unwrap_or_else(|| "Jamendo".to_string()),
            duration_ms: item.duration.unwrap_or(0) * 1000,
            stream_url: item.audio.filter(|u| !u.trim().is_empty()),
            artwork_url: item.album_image.filter(|u| !u.trim().is_empty()),
            external_url: item.shareurl,
            license: item.license_ccurl,
            downloadable: item.audiodownload_allowed.unwrap_or(false),
        })
        .collect();

    Ok(tracks)
}

#[async_trait]
impl MusicProvider for JamendoProvider {
    fn id(&self) -> &'static str {
        "jamendo"
    }
    fn name(&self) -> &'static str {
        "Jamendo"
    }
    fn tier(&self) -> &'static str {
        "Tier 2B — BYOK Open Catalog"
    }
    fn status_label(&self) -> &'static str {
        "Live (BYOK Client ID)"
    }
    fn description(&self) -> &'static str {
        "600,000+ Creative Commons tracks with streaming and artist-permitted downloads."
    }
    fn restriction_note(&self) -> &'static str {
        "Requires your free Jamendo Client ID; respects Creative Commons track licenses."
    }
    fn auth_help(&self) -> Option<&'static str> {
        Some(
            "Get a free Client ID at devportal.jamendo.com (35,000 requests/month non-commercial).",
        )
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
            playlists: true,
            download: true,
            offline_cache_allowed: true,
            lyrics: false,
            requires_auth: true,
        }
    }
    fn auth_fields(&self) -> Vec<ProviderAuthField> {
        vec![ProviderAuthField {
            key: "client_id".to_string(),
            label: "Jamendo Client ID".to_string(),
            is_secret: true,
        }]
    }

    async fn search(&self, query: &str, limit: usize) -> Result<Vec<OnlineTrack>, AppError> {
        let client_id = CredentialStore::get_secret("jamendo", "client_id")?.ok_or_else(|| {
            AppError::Provider(
                "Add your free Jamendo Client ID in Settings -> Providers to search Jamendo."
                    .to_string(),
            )
        })?;

        let client = reqwest::Client::builder()
            .user_agent("Auraliq/0.5.0 (https://github.com/JustyPixels/auraliq)")
            .timeout(Duration::from_secs(15))
            .build()
            .map_err(|e| AppError::Provider(e.to_string()))?;

        let trimmed = query.trim();
        let mut params = vec![
            ("client_id", client_id),
            ("format", "json".to_string()),
            ("limit", limit.to_string()),
            ("audioformat", "mp32".to_string()),
            ("audiodlformat", "mp32".to_string()),
        ];
        if trimmed.is_empty() {
            params.push(("order", "popularity_total".to_string()));
        } else {
            params.push(("search", trimmed.to_string()));
        }

        let resp = client
            .get("https://api.jamendo.com/v3.0/tracks/")
            .query(&params)
            .send()
            .await
            .map_err(|e| AppError::Provider(format!("Jamendo request failed: {e}")))?;

        if !resp.status().is_success() {
            return Err(AppError::Provider(format!(
                "Jamendo returned HTTP {}",
                resp.status()
            )));
        }

        let body = resp
            .text()
            .await
            .map_err(|e| AppError::Provider(e.to_string()))?;
        parse_jamendo_tracks(&body)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_jamendo_fixture() {
        let fixture = r#"{
            "results": [{
                "id": "123",
                "name": "Solar Wind",
                "duration": 185,
                "artist_name": "Indie Creator",
                "album_name": "Starlight",
                "album_image": "https://img.jamendo.com/123.jpg",
                "audio": "https://mp3d.jamendo.com/track/123.mp3",
                "audiodownload_allowed": true,
                "license_ccurl": "https://creativecommons.org/licenses/by-nc/3.0/"
            }]
        }"#;
        let tracks = parse_jamendo_tracks(fixture).unwrap();
        assert_eq!(tracks.len(), 1);
        assert!(tracks[0].downloadable);
        assert_eq!(tracks[0].duration_ms, 185_000);
    }
}
