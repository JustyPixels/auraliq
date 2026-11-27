use std::time::Duration;

use async_trait::async_trait;
use serde::Deserialize;

use crate::error::AppError;
use crate::providers::types::{OnlineTrack, ProviderAuthField, ProviderCapabilities};
use crate::providers::MusicProvider;

pub struct RadioBrowserProvider;

#[derive(Debug, Deserialize)]
struct RadioStationItem {
    stationuuid: String,
    name: String,
    url_resolved: Option<String>,
    url: String,
    favicon: Option<String>,
    country: Option<String>,
    tags: Option<String>,
}

#[derive(Debug, Deserialize)]
struct RadioClickResp {
    ok: bool,
    url: Option<String>,
}

pub fn parse_radio_stations(raw_json: &str) -> Result<Vec<OnlineTrack>, AppError> {
    let items: Vec<RadioStationItem> = serde_json::from_str(raw_json)
        .map_err(|e| AppError::Provider(format!("Radio Browser JSON: {e}")))?;

    let tracks = items
        .into_iter()
        .map(|st| {
            let stream = st
                .url_resolved
                .filter(|u| !u.trim().is_empty())
                .unwrap_or(st.url);
            let artwork_url = st.favicon.filter(|f| f.starts_with("https://"));
            let album = st
                .country
                .filter(|c| !c.trim().is_empty())
                .unwrap_or_else(|| "Live Radio".to_string());
            let artist = st
                .tags
                .filter(|t| !t.trim().is_empty())
                .unwrap_or_else(|| "Internet Radio".to_string());

            OnlineTrack {
                provider_id: "radio_browser".to_string(),
                external_id: st.stationuuid,
                title: st.name.trim().to_string(),
                artist,
                album,
                duration_ms: 0,
                stream_url: Some(stream),
                artwork_url,
                external_url: None,
                license: None,
                downloadable: false,
            }
        })
        .collect();

    Ok(tracks)
}

#[async_trait]
impl MusicProvider for RadioBrowserProvider {
    fn id(&self) -> &'static str {
        "radio_browser"
    }
    fn name(&self) -> &'static str {
        "Radio Browser"
    }
    fn tier(&self) -> &'static str {
        "Tier 2 — MVP Online"
    }
    fn status_label(&self) -> &'static str {
        "Live (Global Radio)"
    }
    fn description(&self) -> &'static str {
        "Community-driven directory of free global internet radio stations."
    }
    fn restriction_note(&self) -> &'static str {
        "Live streams only; downloads and offline caching are disabled."
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
            playback_control: false,
            playlists: false,
            download: false,
            offline_cache_allowed: false,
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
        let hosts = [
            "https://de1.api.radio-browser.info",
            "https://nl1.api.radio-browser.info",
        ];

        for host in hosts {
            let req = if trimmed.is_empty() {
                client.get(format!("{host}/json/stations/topclick/{limit}"))
            } else {
                client.get(format!("{host}/json/stations/search")).query(&[
                    ("name", trimmed),
                    ("hidebroken", "true"),
                    ("order", "clickcount"),
                    ("reverse", "true"),
                    ("limit", &limit.to_string()),
                ])
            };

            if let Ok(resp) = req.send().await {
                if resp.status().is_success() {
                    let body = resp
                        .text()
                        .await
                        .map_err(|e| AppError::Provider(e.to_string()))?;
                    return parse_radio_stations(&body);
                }
            }
        }

        Err(AppError::Provider(
            "Unable to reach Radio Browser directory servers".to_string(),
        ))
    }

    async fn resolve_stream(&self, external_id: &str) -> Result<String, AppError> {
        let client = reqwest::Client::builder()
            .user_agent("Auraliq/0.5.0 (https://github.com/JustyPixels/auraliq)")
            .timeout(Duration::from_secs(10))
            .build()
            .map_err(|e| AppError::Provider(e.to_string()))?;

        let url = format!("https://de1.api.radio-browser.info/json/url/{external_id}");
        let resp = client
            .get(&url)
            .send()
            .await
            .map_err(|e| AppError::Provider(format!("Radio Browser click failed: {e}")))?;

        let parsed: RadioClickResp = resp
            .json()
            .await
            .map_err(|e| AppError::Provider(format!("Radio Browser click JSON: {e}")))?;

        if !parsed.ok {
            return Err(AppError::Provider(
                "Radio Browser failed to resolve station URL".to_string(),
            ));
        }

        parsed
            .url
            .ok_or_else(|| AppError::Provider("Missing resolved station URL".to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_radio_browser_fixture() {
        let fixture = r#"[{
            "stationuuid": "96202f73-0601-11e8-ae97-52543be04c81",
            "name": "Synthwave FM",
            "url_resolved": "https://stream.synth.fm/live.mp3",
            "url": "https://stream.synth.fm/live.pls",
            "favicon": "https://stream.synth.fm/logo.png",
            "country": "Germany",
            "tags": "synthwave,retro"
        }]"#;
        let stations = parse_radio_stations(fixture).unwrap();
        assert_eq!(stations.len(), 1);
        assert_eq!(stations[0].title, "Synthwave FM");
        assert!(!stations[0].downloadable);
        assert_eq!(
            stations[0].stream_url.as_deref(),
            Some("https://stream.synth.fm/live.mp3")
        );
    }
}
