export interface ProviderCatalogEntry {
  id: string;
  name: string;
  tier: "Tier 1 — MVP Core" | "Tier 2 — MVP Online" | "Tier 3 — Optional Restricted";
  statusLabel: string;
  description: string;
  capabilities: {
    search: string;
    playback: string;
    download: string;
    offline: string;
  };
  restrictionNote: string;
}

export const PROVIDER_CATALOG: readonly ProviderCatalogEntry[] = [
  {
    id: "local",
    name: "Local Library",
    tier: "Tier 1 — MVP Core",
    statusLabel: "Scheduled (M4)",
    description: "First-class offline music folders with Symphonia decoding and Lofty metadata.",
    capabilities: {
      search: "Yes (FTS5)",
      playback: "Yes (Local)",
      download: "N/A",
      offline: "Yes",
    },
    restrictionNote: "WMA is unsupported by Symphonia; all local data stays on-device.",
  },
  {
    id: "internet_archive",
    name: "Internet Archive",
    tier: "Tier 2 — MVP Online",
    statusLabel: "Scheduled (M8)",
    description: "Open archival audio catalog with public-domain and live concert recordings.",
    capabilities: {
      search: "Yes",
      playback: "Yes (Stream)",
      download: "Yes (Permitted)",
      offline: "Yes (Cached/DL)",
    },
    restrictionNote: "Respects item licenses and polite API rate limits.",
  },
  {
    id: "radio_browser",
    name: "Radio Browser",
    tier: "Tier 2 — MVP Online",
    statusLabel: "Scheduled (M8)",
    description: "Community-maintained open directory of global internet radio stations.",
    capabilities: {
      search: "Yes",
      playback: "Yes (Live)",
      download: "No (Live)",
      offline: "No",
    },
    restrictionNote: "Live streams only; reports station click metrics per API etiquette.",
  },
  {
    id: "direct_url",
    name: "Direct Audio URLs & RSS",
    tier: "Tier 2 — MVP Online",
    statusLabel: "Scheduled (M8)",
    description: "User-supplied audio stream links and open RSS podcast feeds.",
    capabilities: {
      search: "N/A",
      playback: "Yes",
      download: "Conditional",
      offline: "Conditional",
    },
    restrictionNote: "Only HTTPS URLs validated by the download/stream security layer.",
  },
  {
    id: "youtube",
    name: "YouTube",
    tier: "Tier 3 — Optional Restricted",
    statusLabel: "Post-MVP Optional",
    description: "Official Data API v3 search and visible IFrame Player embed.",
    capabilities: {
      search: "Yes (API Key)",
      playback: "Visible Embed",
      download: "Prohibited",
      offline: "Prohibited",
    },
    restrictionNote:
      "YouTube ToS strictly prohibits audio ripping, hidden/audio-only playback, downloading, and offline caching.",
  },
  {
    id: "spotify",
    name: "Spotify",
    tier: "Tier 3 — Optional Restricted",
    statusLabel: "Post-MVP Optional",
    description: "Metadata lookup, link recognition, and Spotify Connect / external handoff.",
    capabilities: {
      search: "Limited (10 max)",
      playback: "Connect / Ext",
      download: "Prohibited",
      offline: "Prohibited",
    },
    restrictionNote:
      "2026 Spotify Dev Mode requires developer Premium, caps apps at 5 users, and restricts catalog endpoints.",
  },
];
