export interface ProviderCapabilities {
  search: boolean;
  metadata: boolean;
  stream_playback: boolean;
  external_playback_only: boolean;
  playback_control: boolean;
  playlists: boolean;
  download: boolean;
  offline_cache_allowed: boolean;
  lyrics: boolean;
  requires_auth: boolean;
}

export interface ProviderAuthField {
  key: string;
  label: string;
  is_secret: boolean;
}

export interface ProviderInfo {
  id: string;
  name: string;
  tier: string;
  status_label: string;
  description: string;
  restriction_note: string;
  enabled: boolean;
  implemented_for_streaming: boolean;
  auth_configured: boolean;
  auth_help: string | null;
  capabilities: ProviderCapabilities;
  auth_fields: ProviderAuthField[];
}

export interface OnlineTrack {
  provider_id: string;
  external_id: string;
  title: string;
  artist: string;
  album: string;
  duration_ms: number;
  stream_url: string | null;
  download_url?: string | null;
  artwork_url: string | null;
  external_url: string | null;
  license: string | null;
  downloadable: boolean;
}

export interface ProviderSearchResult {
  provider_id: string;
  tracks: OnlineTrack[];
}
