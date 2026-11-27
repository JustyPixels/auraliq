use std::collections::HashMap;
use std::time::Duration;

use async_trait::async_trait;
use serde::Deserialize;

use crate::error::AppError;
use crate::providers::types::{OnlineTrack, ProviderAuthField, ProviderCapabilities};
use crate::providers::MusicProvider;

pub struct AudiusProvider;

#[derive(Debug, Deserialize)]
struct AudiusSearchResp {
    data: Vec<AudiusTrackItem>,
}

#[derive(Debug, Deserialize)]
struct AudiusTrackItem {
    id: String,
    title: String,
    duration: Option<i64>,
    genre: Option<String>,
    permalink: Option<String>,
    user: Option<AudiusUser>,
    artwork: Option<HashMap<String, String>>,
}

#[derive(Debug, Deserialize)]
struct AudiusUser {
    name: Option<String>,
}

pub fn parse_audius_tracks(raw_json: &str) -> Result<Vec<OnlineTrack>, AppError> {
    let parsed: AudiusSearchResp = serde_json::from_str(raw_json)
        .map_err(|e| AppError::Provider(format!("Audius JSON: {e}")))?;

    let tracks = parsed
        .data
        .into_iter()
        .map(|item| {
            let artist = item
                .user
                .and_then(|u| u.name)
                .unwrap_or_else(|| "Audius Artist".to_string());
            let artwork_url = item
                .artwork
                .and_then(|map| map.get("480x480").or_else(|| map.get("150x150")).cloned());
            let external_url = item
                .permalink
                .map(|p| format!("https://audius.co/{}", p.trim_start_matches('/')));
            let stream_url = Some(format!(
                "https://api.audius.co/v1/tracks/{}/stream?app_name=Auraliq",
                item.id
            ));

            OnlineTrack {
                provider_id: "audius".to_string(),
                external_id: item.id,
                title: item.title,
                artist,
                album: item.genre.unwrap_or_else(|| "Audius".to_string()),
                duration_ms: item.duration.unwrap_or(0) * 1000,
                stream_url,
                artwork_url,
                external_url,
                license: None,
                downloadable: false,
            }
        })
        .collect();

    Ok(tracks)
}

#[async_trait]
impl MusicProvider for AudiusProvider {
    fn id(&self) -> &'static str {
        "audius"
    }
    fn name(&self) -> &'static str {
        "Audius"
    }
    fn tier(&self) -> &'static str {
        "Tier 2 — MVP Online"
    }
    fn status_label(&self) -> &'static str {
        "Live (Free Streaming)"
    }
    fn description(&self) -> &'static str {
        "Open decentralized music catalog with free 320kbps streaming and zero account required."
    }
    fn restriction_note(&self) -> &'static str {
        "Downloads depend on individual artist permissions; streaming is free and open."
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
            playlists: true,
            download: false,
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
        let req = if trimmed.is_empty() {
            client
                .get("https://api.audius.co/v1/tracks/trending")
                .query(&[("app_name", "Auraliq"), ("limit", &limit.to_string())])
        } else {
            client
                .get("https://api.audius.co/v1/tracks/search")
                .query(&[
                    ("query", trimmed),
                    ("app_name", "Auraliq"),
                    ("limit", &limit.to_string()),
                ])
        };

        let resp = req
            .send()
            .await
            .map_err(|e| AppError::Provider(format!("Audius request failed: {e}")))?;

        if !resp.status().is_success() {
            return Err(AppError::Provider(format!(
                "Audius returned HTTP {}",
                resp.status()
            )));
        }

        let body = resp
            .text()
            .await
            .map_err(|e| AppError::Provider(e.to_string()))?;
        parse_audius_tracks(&body)
    }

    async fn resolve_stream(&self, external_id: &str) -> Result<String, AppError> {
        Ok(format!(
            "https://api.audius.co/v1/tracks/{external_id}/stream?app_name=Auraliq"
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_audius_search_fixture() {
        let fixture = r#"{
            "data": [{
                "id": "D3gXE",
                "title": "Midnight Signal",
                "duration": 215,
                "genre": "Electronic",
                "permalink": "/neon/midnight-signal",
                "user": { "name": "Neon Synth" },
                "artwork": { "480x480": "https://cdn.audius.co/art.jpg" }
            }]
        }"#;
        let tracks = parse_audius_tracks(fixture).unwrap();
        assert_eq!(tracks.len(), 1);
        assert_eq!(tracks[0].title, "Midnight Signal");
        assert_eq!(tracks[0].artist, "Neon Synth");
        assert_eq!(tracks[0].duration_ms, 215_000);
        assert!(tracks[0]
            .stream_url
            .as_deref()
            .unwrap()
            .contains("/v1/tracks/D3gXE/stream"));
    }
}
