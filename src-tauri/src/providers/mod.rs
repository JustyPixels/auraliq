pub mod types;

use std::sync::Arc;

use async_trait::async_trait;

use crate::database::Database;
use crate::error::AppError;
use crate::security::credentials::CredentialStore;
pub use types::{
    OnlineTrack, ProviderAuthField, ProviderCapabilities, ProviderInfo, ProviderSearchResult,
};

#[async_trait]
pub trait MusicProvider: Send + Sync {
    fn id(&self) -> &'static str;
    fn name(&self) -> &'static str;
    fn tier(&self) -> &'static str;
    fn status_label(&self) -> &'static str;
    fn description(&self) -> &'static str;
    fn restriction_note(&self) -> &'static str;
    fn default_enabled(&self) -> bool;
    fn implemented_for_streaming(&self) -> bool;
    fn capabilities(&self) -> ProviderCapabilities;
    fn auth_fields(&self) -> Vec<ProviderAuthField>;

    async fn search(&self, _query: &str, _limit: usize) -> Result<Vec<OnlineTrack>, AppError> {
        Err(AppError::UnsupportedProviderAction(format!(
            "Online search for '{}' is scheduled for Milestone 8",
            self.name()
        )))
    }

    async fn resolve_stream(&self, _external_id: &str) -> Result<String, AppError> {
        Err(AppError::UnsupportedProviderAction(format!(
            "Streaming for '{}' is not enabled in this milestone",
            self.name()
        )))
    }
}

struct DescriptorProvider {
    id: &'static str,
    name: &'static str,
    tier: &'static str,
    status_label: &'static str,
    description: &'static str,
    restriction_note: &'static str,
    default_enabled: bool,
    implemented_for_streaming: bool,
    capabilities: ProviderCapabilities,
    auth_fields: Vec<(&'static str, &'static str, bool)>,
}

#[async_trait]
impl MusicProvider for DescriptorProvider {
    fn id(&self) -> &'static str {
        self.id
    }
    fn name(&self) -> &'static str {
        self.name
    }
    fn tier(&self) -> &'static str {
        self.tier
    }
    fn status_label(&self) -> &'static str {
        self.status_label
    }
    fn description(&self) -> &'static str {
        self.description
    }
    fn restriction_note(&self) -> &'static str {
        self.restriction_note
    }
    fn default_enabled(&self) -> bool {
        self.default_enabled
    }
    fn implemented_for_streaming(&self) -> bool {
        self.implemented_for_streaming
    }
    fn capabilities(&self) -> ProviderCapabilities {
        self.capabilities.clone()
    }
    fn auth_fields(&self) -> Vec<ProviderAuthField> {
        self.auth_fields
            .iter()
            .map(|(k, l, s)| ProviderAuthField {
                key: (*k).to_string(),
                label: (*l).to_string(),
                is_secret: *s,
            })
            .collect()
    }
}

pub struct ProviderRegistry {
    providers: Vec<Arc<dyn MusicProvider>>,
}

impl ProviderRegistry {
    pub fn new() -> Self {
        let providers: Vec<Arc<dyn MusicProvider>> = vec![
            Arc::new(DescriptorProvider {
                id: "local",
                name: "Local Library",
                tier: "Tier 1 — MVP Core",
                status_label: "Active (M4)",
                description: "Offline local music folders with Symphonia decoding and SQLite FTS5.",
                restriction_note: "WMA is unsupported by Symphonia; all data stays local.",
                default_enabled: true,
                implemented_for_streaming: true,
                capabilities: ProviderCapabilities {
                    search: true,
                    metadata: true,
                    stream_playback: true,
                    external_playback_only: false,
                    playback_control: true,
                    playlists: true,
                    download: false,
                    offline_cache_allowed: false,
                    lyrics: false,
                    requires_auth: false,
                },
                auth_fields: vec![],
            }),
            Arc::new(DescriptorProvider {
                id: "internet_archive",
                name: "Internet Archive",
                tier: "Tier 2 — MVP Online",
                status_label: "Framework Ready (M8)",
                description: "Open archival audio catalog with free streaming and permitted downloads.",
                restriction_note: "Respects item licenses and polite API rate limits.",
                default_enabled: true,
                implemented_for_streaming: false,
                capabilities: ProviderCapabilities {
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
                },
                auth_fields: vec![],
            }),
            Arc::new(DescriptorProvider {
                id: "audius",
                name: "Audius",
                tier: "Tier 2 — MVP Online",
                status_label: "Framework Ready (M8)",
                description: "Open decentralized music catalog with free 320kbps streaming.",
                restriction_note: "Downloads depend on individual artist track permissions.",
                default_enabled: true,
                implemented_for_streaming: false,
                capabilities: ProviderCapabilities {
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
                },
                auth_fields: vec![],
            }),
            Arc::new(DescriptorProvider {
                id: "radio_browser",
                name: "Radio Browser",
                tier: "Tier 2 — MVP Online",
                status_label: "Framework Ready (M8)",
                description: "Community-driven directory of free global internet radio stations.",
                restriction_note: "Live streams only; downloads and offline caching are disabled.",
                default_enabled: true,
                implemented_for_streaming: false,
                capabilities: ProviderCapabilities {
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
                },
                auth_fields: vec![],
            }),
            Arc::new(DescriptorProvider {
                id: "direct_url",
                name: "Direct Audio URLs & RSS",
                tier: "Tier 2 — MVP Online",
                status_label: "Framework Ready (M8)",
                description: "User-supplied HTTPS audio stream links and open podcast RSS feeds.",
                restriction_note: "URLs are validated against SSRF and private-IP blocklists.",
                default_enabled: true,
                implemented_for_streaming: true,
                capabilities: ProviderCapabilities {
                    search: false,
                    metadata: true,
                    stream_playback: true,
                    external_playback_only: false,
                    playback_control: true,
                    playlists: false,
                    download: false,
                    offline_cache_allowed: false,
                    lyrics: false,
                    requires_auth: false,
                },
                auth_fields: vec![],
            }),
            Arc::new(DescriptorProvider {
                id: "jamendo",
                name: "Jamendo",
                tier: "Tier 2B — Open Catalog",
                status_label: "Optional (BYO Client ID)",
                description: "Creative Commons independent music catalog (35k req/month free tier).",
                restriction_note: "Requires user-provided Jamendo Client ID; respects CC license terms.",
                default_enabled: false,
                implemented_for_streaming: false,
                capabilities: ProviderCapabilities {
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
                },
                auth_fields: vec![("client_id", "Jamendo Client ID", true)],
            }),
            Arc::new(DescriptorProvider {
                id: "youtube",
                name: "YouTube",
                tier: "Tier 3 — Optional Restricted",
                status_label: "Restricted (Visible Embed)",
                description: "Data API v3 search and visible IFrame Player embed.",
                restriction_note: "YouTube ToS strictly prohibits audio ripping, hidden/audio-only play, downloading, and offline caching.",
                default_enabled: false,
                implemented_for_streaming: false,
                capabilities: ProviderCapabilities {
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
                },
                auth_fields: vec![("api_key", "YouTube Data API v3 Key", true)],
            }),
            Arc::new(DescriptorProvider {
                id: "spotify",
                name: "Spotify",
                tier: "Tier 3 — Optional Restricted",
                status_label: "Restricted (Connect / Metadata)",
                description: "Metadata lookup and Spotify Connect / external player handoff.",
                restriction_note: "2026 Spotify Dev Mode requires developer Premium, caps at 5 users, and prohibits downloads or stream extraction.",
                default_enabled: false,
                implemented_for_streaming: false,
                capabilities: ProviderCapabilities {
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
                },
                auth_fields: vec![("client_id", "Spotify Client ID", true)],
            }),
        ];

        Self { providers }
    }

    pub fn get(&self, provider_id: &str) -> Option<&Arc<dyn MusicProvider>> {
        self.providers.iter().find(|p| p.id() == provider_id)
    }

    pub fn list_providers(&self, db: &Database) -> Vec<ProviderInfo> {
        self.providers
            .iter()
            .map(|p| {
                let enabled = db
                    .is_provider_enabled(p.id(), p.default_enabled())
                    .unwrap_or(p.default_enabled());
                let fields = p.auth_fields();
                let auth_configured = if fields.is_empty() {
                    true
                } else {
                    fields
                        .iter()
                        .all(|f| CredentialStore::has_secret(p.id(), &f.key))
                };

                ProviderInfo {
                    id: p.id().to_string(),
                    name: p.name().to_string(),
                    tier: p.tier().to_string(),
                    status_label: p.status_label().to_string(),
                    description: p.description().to_string(),
                    restriction_note: p.restriction_note().to_string(),
                    enabled,
                    implemented_for_streaming: p.implemented_for_streaming(),
                    auth_configured,
                    capabilities: p.capabilities(),
                    auth_fields: fields,
                }
            })
            .collect()
    }

    pub async fn search(
        &self,
        provider_id: &str,
        enabled: bool,
        query: &str,
        limit: usize,
    ) -> Result<ProviderSearchResult, AppError> {
        let provider = self
            .get(provider_id)
            .ok_or_else(|| AppError::NotFound(format!("provider {provider_id}")))?;
        if !enabled {
            return Err(AppError::Provider(format!(
                "Provider '{}' is disabled",
                provider.name()
            )));
        }
        if !provider.capabilities().search {
            return Err(AppError::UnsupportedProviderAction(format!(
                "'{}' does not support search",
                provider.name()
            )));
        }
        let tracks = provider.search(query, limit).await?;
        Ok(ProviderSearchResult {
            provider_id: provider_id.to_string(),
            tracks,
        })
    }
}

impl Default for ProviderRegistry {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn enforces_tos_capability_invariants() {
        let registry = ProviderRegistry::new();
        let yt = registry.get("youtube").expect("youtube provider");
        assert!(!yt.capabilities().download);
        assert!(!yt.capabilities().offline_cache_allowed);
        assert!(yt.capabilities().external_playback_only);

        let sp = registry.get("spotify").expect("spotify provider");
        assert!(!sp.capabilities().download);
        assert!(!sp.capabilities().offline_cache_allowed);

        let rb = registry.get("radio_browser").expect("radio browser");
        assert!(!rb.capabilities().download);
        assert!(!rb.capabilities().offline_cache_allowed);
    }
}
