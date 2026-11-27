use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderCapabilities {
    pub search: bool,
    pub metadata: bool,
    pub stream_playback: bool,
    pub external_playback_only: bool,
    pub playback_control: bool,
    pub playlists: bool,
    pub download: bool,
    pub offline_cache_allowed: bool,
    pub lyrics: bool,
    pub requires_auth: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderAuthField {
    pub key: String,
    pub label: String,
    pub is_secret: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderInfo {
    pub id: String,
    pub name: String,
    pub tier: String,
    pub status_label: String,
    pub description: String,
    pub restriction_note: String,
    pub enabled: bool,
    pub implemented_for_streaming: bool,
    pub auth_configured: bool,
    pub capabilities: ProviderCapabilities,
    pub auth_fields: Vec<ProviderAuthField>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OnlineTrack {
    pub provider_id: String,
    pub external_id: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub duration_ms: i64,
    pub stream_url: Option<String>,
    pub artwork_url: Option<String>,
    pub external_url: Option<String>,
    pub license: Option<String>,
    pub downloadable: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderSearchResult {
    pub provider_id: String,
    pub tracks: Vec<OnlineTrack>,
}
