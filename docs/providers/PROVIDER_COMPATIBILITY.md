# Auraliq — Provider Compatibility & Capability Matrix

> **Principle**: Auraliq never fakes support, never bypasses DRM/subscriptions/paywalls, and never enables downloads or offline caching for platforms that prohibit them. Every provider declares a `ProviderCapabilities` profile that dynamically governs the UI.

---

## 1. Compatibility Matrix

| Provider | Search | Metadata | In-App Playback | Download | Offline Cache | Auth Required | Status / Tier |
|---|---|---|---|---|---|---|---|
| **Local Library** | Yes | Yes (tags + art) | Yes (Symphonia) | N/A (local) | Yes (native) | No | **Tier 1 — MVP Core** |
| **Internet Archive** | Yes | Yes | Yes (HTTP stream) | Yes (MP3/FLAC/OGG) | Yes (if permitted) | No | **Tier 2 — MVP Online** |
| **Radio Browser** | Yes | Yes (station/tags) | Yes (live stream) | No (live radio) | No (live stream) | No | **Tier 2 — MVP Online** |
| **Direct Audio URLs / RSS** | N/A (URL) | Partial (headers/ID3) | Yes | Conditional (user-owned/open) | Yes (if open) | Optional | **Tier 2 — MVP Online** |
| **Jamendo** | Yes | Yes | Yes | Yes (CC license) | Yes (per CC) | Client ID | **Tier 2B — Post-MVP Open** |
| **Audius** | Yes | Yes | Yes (up to 320k) | Conditional (artist setting) | Conditional | No (open API) | **Tier 2B — Post-MVP Open** |
| **YouTube** | Yes (Data API v3) | Yes | **Embed Only** (visible IFrame) | **No** (prohibited) | **No** (prohibited) | API Key / OAuth | **Tier 3 — Optional Compliant** |
| **Spotify** | Limited (10 results in Dev Mode) | Limited | **Premium Connect / External** | **No** (prohibited) | **No** (prohibited) | OAuth + Premium | **Tier 3 — Optional Limited** |
| **SoundCloud** | Yes (if approved) | Yes | Gated | **No** (strictly prohibited) | **No** (prohibited) | OAuth 2.1 (gated) | **Tier 4 — Deferred** |
| **Deezer** | Yes | Yes | 30s preview / Premium OAuth | **No** | **No** | OAuth (Premium) | **Tier 4 — Deferred** |
| **Apple MusicKit** | Yes | Yes | Subscription / 30s preview | **No** | **No** | Paid Apple Dev + Sub | **Tier 4 — Deferred** |
| **Bandcamp** | **No** | **No** | **No** | **No** | **No** | N/A | **Not Viable (No Public API)** |

---

## 2. Lyrics Provider

| Provider | Synced LRC | Plain Lyrics | Auth | Legal / UX Rule |
|---|---|---|---|---|
| **LRCLIB** (`lrclib.net`) | Yes | Yes | No (requires `User-Agent`) | **Optional opt-in** feature with clear source attribution; never scrape copyrighted lyric sites. |

---

## 3. UI Transparency Rules

1. **Source Badges**: Every track row, search result, queue item, and now-playing bar displays its source badge (`LOCAL`, `ARCHIVE`, `RADIO`, `JAMENDO`, `AUDIUS`, `YOUTUBE`, `SPOTIFY`).
2. **Disabled Actions with Reason**: If `capabilities.download == false`, the download action is hidden or disabled with a clear tooltip (e.g., *"Downloads are prohibited by YouTube Terms of Service"*).
3. **Offline Mode**: Uncached online tracks and non-cacheable providers (Radio, YouTube, Spotify) are visibly marked **Unavailable Offline** when disconnected.
4. **No Misleading Playback**: YouTube playback uses a visible, compliant IFrame embed rather than hidden audio ripping; Spotify clearly states when playback is routed via Spotify Connect or external app handoff.
