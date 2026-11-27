export type DownloadStatus =
  "queued" | "downloading" | "paused" | "completed" | "failed" | "canceled";

export interface DownloadRecord {
  id: number;
  provider_id: string;
  external_id: string;
  title: string;
  artist: string;
  album: string;
  license: string | null;
  artwork_url: string | null;
  source_url: string | null;
  target_path: string;
  status: DownloadStatus | string;
  bytes_downloaded: number;
  total_bytes: number | null;
  error_message: string | null;
  created_at: number;
  updated_at: number;
}

export interface DownloadSettings {
  download_dir: string;
  max_concurrent: number;
  naming_template: string;
  auto_tag: boolean;
  auto_add_to_library: boolean;
}

export interface CacheEntryRecord {
  cache_key: string;
  provider_id: string;
  external_id: string;
  title: string;
  artist: string;
  file_path: string;
  size_bytes: number;
  created_at: number;
  last_accessed_at: number;
  expires_at: number;
}

export interface CacheSettings {
  enabled: boolean;
  max_size_mb: number;
  ttl_hours: number;
  offline_mode: boolean;
}

export interface CacheStats {
  entry_count: number;
  total_bytes: number;
  max_bytes: number;
  enabled: boolean;
  max_size_mb: number;
  ttl_hours: number;
  offline_mode: boolean;
  cache_dir: string;
}
