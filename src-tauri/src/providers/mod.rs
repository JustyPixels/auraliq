pub mod audius;
pub mod freesound;
pub mod internet_archive;
pub mod jamendo;
pub mod radio_browser;
pub mod types;
pub mod youtube;

use std::sync::Arc;

use async_trait::async_trait;

use crate::database::Database;
use crate::error::AppError;
use crate::security::credentials::CredentialStore;
use audius::AudiusProvider;
use freesound::FreesoundProvider;
use internet_archive::InternetArchiveProvider;
use jamendo::JamendoProvider;
use radio_browser::RadioBrowserProvider;
pub use types::{
    OnlineTrack, ProviderAuthField, ProviderCapabilities, ProviderInfo, ProviderSearchResult,
};
use youtube::YouTubeProvider;

#[async_trait]
pub trait MusicProvider: Send + Sync {
    fn id(&self) -> &'static str;
    fn name(&self) -> &'static str;
    fn tier(&self) -> &'static str;
    fn status_label(&self) -> &'static str;
    fn description(&self) -> &'static str;
    fn restriction_note(&self) -> &'static str;
    fn auth_help(&self) -> Option<&'static str>;
    fn default_enabled(&self) -> bool;
    fn implemented_for_streaming(&self) -> bool;
    fn capabilities(&self) -> ProviderCapabilities;
    fn auth_fields(&self) -> Vec<ProviderAuthField>;

    async fn search(&self, _query: &str, _limit: usize) -> Result<Vec<OnlineTrack>, AppError> {
        Err(AppError::UnsupportedProviderAction(format!(
            "Online search is not supported by '{}'",
            self.name()
        )))
    }

    async fn resolve_stream(&self, _external_id: &str) -> Result<String, AppError> {
        Err(AppError::UnsupportedProviderAction(format!(
            "Stream resolution is not supported by '{}'",
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
    auth_help: Option<&'static str>,
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
    fn auth_help(&self) -> Option<&'static str> {
        self.auth_help
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
                auth_help: None,
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
            Arc::new(AudiusProvider),
            Arc::new(InternetArchiveProvider),
            Arc::new(RadioBrowserProvider),
            Arc::new(DescriptorProvider {
                id: "direct_url",
                name: "Direct Audio URLs & RSS",
                tier: "Tier 2 — MVP Online",
                status_label: "Live (Stream URL)",
                description: "User-supplied HTTPS audio stream links and direct MP3/OGG/FLAC URLs.",
                restriction_note: "URLs are validated against SSRF and private-IP blocklists.",
                auth_help: None,
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
            Arc::new(JamendoProvider),
            Arc::new(FreesoundProvider),
            Arc::new(YouTubeProvider),
            Arc::new(DescriptorProvider {
                id: "spotify",
                name: "Spotify",
                tier: "Tier 3 — Optional Restricted",
                status_label: "Restricted (Metadata)",
                description: "Metadata lookup and Spotify Connect / external player handoff.",
                restriction_note: "2026 Spotify Dev Mode requires developer Premium, caps at 5 users, and prohibits downloads or stream extraction.",
                auth_help: Some("Optional Spotify Developer Client ID (requires Spotify Premium developer account)."),
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
                    auth_help: p.auth_help().map(ToString::to_string),
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
                "Provider '{}' is disabled. Enable it in Settings -> Providers.",
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

    pub async fn resolve_stream(
        &self,
        provider_id: &str,
        external_id: &str,
    ) -> Result<String, AppError> {
        let provider = self
            .get(provider_id)
            .ok_or_else(|| AppError::NotFound(format!("provider {provider_id}")))?;
        if !provider.capabilities().stream_playback {
            return Err(AppError::UnsupportedProviderAction(format!(
                "'{}' does not permit direct in-app audio streaming",
                provider.name()
            )));
        }
        provider.resolve_stream(external_id).await
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
        assert!(rb.implemented_for_streaming());

        let audius = registry.get("audius").expect("audius provider");
        assert!(audius.implemented_for_streaming());
        assert!(registry.get("freesound").is_some());
    }
}
