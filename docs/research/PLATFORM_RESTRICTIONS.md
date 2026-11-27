# Auraliq — Platform Restrictions & Legal Compliance

> **Core Rule**: Auraliq respects every platform's Terms of Service, DRM, subscription gates, and copyright boundaries. Never implement unauthorized stream extraction, scraping, or restriction bypasses.

---

## 1. Platform-Specific Restrictions

### YouTube
- **Official Docs**: [YouTube API Services Terms of Service](https://developers.google.com/youtube/terms/api-services-terms-of-service) | [IFrame Player API](https://developers.google.com/youtube/iframe_api_reference)
- **Hard Prohibitions**:
  - **No downloading, ripping, or audio extraction** (no MP3 conversion, no `yt-dlp` stream extraction).
  - **No local audio caching** or offline playback of YouTube media.
  - **No headless / hidden / audio-only playback** or background-play circumvention; the IFrame player must remain visible with required YouTube controls/branding intact.

### Spotify
- **Official Docs**: [Spotify Developer Policy](https://developer.spotify.com/policy) | [Web Playback SDK](https://developer.spotify.com/documentation/web-playback-sdk)
- **2026 Developer Restrictions**:
  - **Development Mode**: Requires developer to hold an active **Spotify Premium** account, caps authorized users at **5 users**, throttles search to **10 results**, and removed several catalog endpoints (artist top tracks, new releases, bulk metadata, etc.).
  - **Extended Quota**: Requires a registered business entity and **250,000+ MAU**.
  - **Web Playback SDK**: Requires end-user **Spotify Premium**.
- **Hard Prohibitions**: No downloading, no stream extraction, no mixing Spotify audio with other sources, no bypassing Premium gates.

### SoundCloud
- **Official Docs**: [SoundCloud API Terms of Use](https://developers.soundcloud.com/docs/api/terms-of-use)
- **Restrictions**: OAuth 2.1 with gated app approval. **Strictly prohibits** permanent or temporary offline downloads via the API, even when an uploader enabled web downloads.

### Internet Archive
- **Official Docs**: [Internet Archive Terms of Use](https://archive.org/about/terms.php) | [Developer Portal](https://archive.org/developers/)
- **Permissions**: Open metadata/item APIs; streaming and direct file downloads (MP3/FLAC/OGG) are permitted for archival/public-domain/open items while respecting rate limits and item licenses.

### Jamendo & Audius
- **Jamendo** ([developer.jamendo.com](https://developer.jamendo.com/)): Free non-commercial API (`client_id`, ~35k req/month). Streaming and MP3 downloads permitted per each track's Creative Commons license.
- **Audius** ([docs.audius.org](https://docs.audius.org/)): Open decentralized REST API/SDK; free streaming up to 320kbps. Downloads only where the artist explicitly enabled them.

### Radio Browser
- **Official Docs**: [api.radio-browser.info](https://api.radio-browser.info/)
- **Requirements**: Open/free directory; requires a descriptive `User-Agent` header (e.g., `Auraliq/0.1.0`) and reporting station click metrics. Live streams only (no downloads).

### Deezer, Apple MusicKit & Bandcamp
- **Deezer** ([developers.deezer.com](https://developers.deezer.com/)): Free users limited to 30s previews; full playback requires Deezer Premium OAuth; local audio/image caching restricted.
- **Apple MusicKit** ([developer.apple.com/musickit](https://developer.apple.com/musickit/)): Requires paid Apple Developer Program, strict App Review monetization rules (Guideline 4.5.2), and Apple Music subscription (30s preview fallback).
- **Bandcamp** ([bandcamp.com/terms_of_use](https://bandcamp.com/terms_of_use)): No public consumer streaming API; web scraping and unofficial third-party clients are prohibited.

---

## 2. Lyrics & Copyright

- **LRCLIB** ([lrclib.net/docs](https://lrclib.net/docs)): Requires identifying `User-Agent` header. Because lyrics are crowd-sourced copyrighted text, Auraliq treats lyrics as an **optional opt-in** feature with clear attribution (`Source: LRCLIB`) and never scrapes commercial lyric websites.

---

## 3. Security & Privacy Guardrails

1. **Credentials**: Store OAuth tokens and optional user API keys only in Windows Credential Manager (`keyring`).
2. **Telemetry**: Zero telemetry by default; any diagnostics/crash reporting must be explicit opt-in.
3. **Local Privacy**: Never upload local library paths, metadata, or audio files to external servers (except user-initiated opt-in lyrics lookup sending only track/artist/album/duration).
