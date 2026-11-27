use std::time::Duration;

use async_trait::async_trait;
use serde::Deserialize;

use crate::error::AppError;
use crate::providers::types::{OnlineTrack, ProviderAuthField, ProviderCapabilities};
use crate::providers::MusicProvider;
use crate::security::credentials::CredentialStore;

pub struct YouTubeProvider;

#[derive(Debug, Deserialize)]
struct YouTubeSearchResp {
    items: Vec<YouTubeItem>,
}

#[derive(Debug, Deserialize)]
struct YouTubeItem {
    id: YouTubeId,
    snippet: YouTubeSnippet,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct YouTubeId {
    video_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct YouTubeSnippet {
    title: String,
    channel_title: Option<String>,
    thumbnails: Option<YouTubeThumbnails>,
}

#[derive(Debug, Deserialize)]
struct YouTubeThumbnails {
    medium: Option<YouTubeThumb>,
}

#[derive(Debug, Deserialize)]
struct YouTubeThumb {
    url: String,
}

pub fn parse_youtube_tracks(raw_json: &str) -> Result<Vec<OnlineTrack>, AppError> {
    let parsed: YouTubeSearchResp = serde_json::from_str(raw_json)
        .map_err(|e| AppError::Provider(format!("YouTube JSON: {e}")))?;

    let tracks = parsed
        .items
        .into_iter()
        .filter_map(|item| {
            let vid = item.id.video_id?;
            Some(OnlineTrack {
                provider_id: "youtube".to_string(),
                external_id: vid.clone(),
                title: item.snippet.title,
                artist: item
                    .snippet
                    .channel_title
                    .unwrap_or_else(|| "YouTube".to_string()),
                album: "YouTube Music".to_string(),
                duration_ms: 0,
                stream_url: None,
                download_url: None,
                artwork_url: item
                    .snippet
                    .thumbnails
                    .and_then(|t| t.medium.map(|m| m.url)),
                external_url: Some(format!("https://www.youtube.com/watch?v={vid}")),
                license: None,
                downloadable: false,
            })
        })
        .collect();

    Ok(tracks)
}

#[async_trait]
impl MusicProvider for YouTubeProvider {
    fn id(&self) -> &'static str {
        "youtube"
    }
    fn name(&self) -> &'static str {
        "YouTube"
    }
    fn tier(&self) -> &'static str {
        "Tier 3 — Optional Restricted"
    }
    fn status_label(&self) -> &'static str {
        "BYOK Search (External)"
    }
    fn description(&self) -> &'static str {
        "YouTube Data API v3 search with compliant external YouTube watch handoff."
    }
    fn restriction_note(&self) -> &'static str {
        "YouTube ToS strictly prohibits audio ripping, hidden/audio-only play, downloading, and offline caching."
    }
    fn auth_help(&self) -> Option<&'static str> {
        Some("Create a YouTube Data API v3 key in Google Cloud Console.")
    }
    fn default_enabled(&self) -> bool {
        false
    }
    fn implemented_for_streaming(&self) -> bool {
        false
    }
    fn capabilities(&self) -> ProviderCapabilities {
        ProviderCapabilities {
            search: true,
            metadata: true,
            stream_playback: false,
            external_playback_only: true,
            playback_control: true,
            playlists: false,
            download: false,
            offline_cache_allowed: false,
            lyrics: false,
            requires_auth: true,
        }
    }
    fn auth_fields(&self) -> Vec<ProviderAuthField> {
        vec![ProviderAuthField {
            key: "api_key".to_string(),
            label: "YouTube Data API v3 Key".to_string(),
            is_secret: true,
        }]
    }

    async fn search(&self, query: &str, limit: usize) -> Result<Vec<OnlineTrack>, AppError> {
        let api_key = CredentialStore::get_secret("youtube", "api_key")?.ok_or_else(|| {
            AppError::Provider(
                "Add your YouTube Data API v3 key in Settings -> Providers to search YouTube."
                    .to_string(),
            )
        })?;

        let client = reqwest::Client::builder()
            .user_agent("Auraliq/0.5.0 (https://github.com/JustyPixels/auraliq)")
            .timeout(Duration::from_secs(15))
            .build()
            .map_err(|e| AppError::Provider(e.to_string()))?;

        let q = if query.trim().is_empty() {
            "synthwave"
        } else {
            query.trim()
        };

        let resp = client
            .get("https://www.googleapis.com/youtube/v3/search")
            .query(&[
                ("part", "snippet"),
                ("type", "video"),
                ("videoCategoryId", "10"),
                ("maxResults", &limit.to_string()),
                ("q", q),
                ("key", &api_key),
            ])
            .send()
            .await
            .map_err(|e| AppError::Provider(format!("YouTube request failed: {e}")))?;

        if !resp.status().is_success() {
            return Err(AppError::Provider(format!(
                "YouTube returned HTTP {}",
                resp.status()
            )));
        }

        let body = resp
            .text()
            .await
            .map_err(|e| AppError::Provider(e.to_string()))?;
        parse_youtube_tracks(&body)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_youtube_fixture() {
        let fixture = r#"{
            "items": [{
                "id": { "videoId": "dQw4w9WgXcQ" },
                "snippet": {
                    "title": "Demo Track",
                    "channelTitle": "Official Channel",
                    "thumbnails": { "medium": { "url": "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg" } }
                }
            }]
        }"#;
        let tracks = parse_youtube_tracks(fixture).unwrap();
        assert_eq!(tracks.len(), 1);
        assert!(tracks[0].stream_url.is_none());
        assert!(!tracks[0].downloadable);
        assert_eq!(
            tracks[0].external_url.as_deref(),
            Some("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
        );
    }
}
