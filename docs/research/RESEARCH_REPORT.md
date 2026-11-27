# Auraliq — Milestone 0 Research Report

> **Milestone**: 0 (Research & Feasibility)  
> **Target Platform**: Windows 10 / 11 x64 (MVP), Linux & macOS (future)  
> **Date**: 2026-11-27

---

## 1. Application Shell: Tauri v2 Architecture & Windows Toolchain

- **Framework**: **Tauri v2 (`tauri` 2.12.7)** ([tauri.app](https://v2.tauri.app/)). Uses the OS native WebView (**WebView2** on Windows) rather than bundling Chromium, yielding ~30–50 MB idle RAM and ~10–25 MB installers vs. Electron's 100–150+ MB baseline.
- **Security Model**: Tauri v2 replaces global allowlists with per-window **Capabilities** (`src-tauri/capabilities/*.json`) enforcing least-privilege IPC access and a strict Content Security Policy (CSP) ([Tauri Security](https://v2.tauri.app/security/)).
- **Critical Local Environment Finding**:
  - `rustc 1.94.0` / `cargo 1.94.0` in PATH currently resolves to Chocolatey's `x86_64-pc-windows-gnu`, while `rustup` has `stable-x86_64-pc-windows-msvc` and `1.96.0-x86_64-pc-windows-msvc` installed alongside Visual Studio 18.
  - **Tauri v2 officially supports ONLY `x86_64-pc-windows-msvc` on Windows** ([Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/)). The GNU toolchain fails static linking against `WebView2LoaderStatic.lib` (COM ABI mismatch) and breaks NSIS/MSI bundling.
  - **Action for Milestone 1**: Pin the MSVC toolchain via `rust-toolchain.toml` and ensure `%USERPROFILE%\.cargo\bin` precedes Chocolatey in dev/CI environments.

---

## 2. Rust Audio Engine: Playback, Decoding, Output & DSP

| Component | Selected Crate | Version | Alternative Evaluated | Why Selected |
|---|---|---|---|---|
| **Decoding & Demuxing** | `symphonia` | `0.6.1` | `rodio` (`0.21.0`) | Pure Rust, safe, modular codecs/demuxers, sample-accurate seeking, direct PCM frame access. `rodio` wraps `symphonia`+`cpal` but hides PCM buffers needed for FFT visualizers, device hot-switching, and future gapless/EQ/ReplayGain. |
| **Audio Output** | `cpal` | `0.18.2` | `rodio` sink | Low-level cross-platform audio I/O (WASAPI on Windows), explicit device enumeration and output selection. |
| **Resampling** | `rubato` | `5.1.0` | Linear interpolation | High-quality async/sync sample-rate conversion when track sample rate differs from output device rate. |
| **Visualizer FFT** | `realfft` | `3.5.0` | `rustfft` | Optimized real-valued FFT for spectrum analyzer & CRT/retro bar visualizers without JS audio decoding overhead. |

### Audio Format Compatibility Matrix (`symphonia` `0.6.1`)

| Format / Codec | Supported | Feature Flags / Crate | Notes |
|---|---|---|---|
| **MP3** (MP1/MP2/MP3) | Yes | `mp3` / `mpa` (or `all`) | Full decode & seek support ([docs.rs/symphonia](https://docs.rs/symphonia)). |
| **FLAC** | Yes | `flac` (default) | Lossless frame reader & decoder. |
| **WAV** (PCM) | Yes | `wav` (default) | RIFF/WAV demuxer & PCM codec. |
| **AAC / M4A** | Yes | `aac`, `isomp4` (or `all`) | AAC-LC inside ISO/MP4 containers (`.m4a`, `.mp4`). |
| **OGG Vorbis** | Yes | `ogg`, `vorbis` (default) | Standard Ogg Vorbis container + codec. |
| **Opus** | Yes | `symphonia-opus` | Supported via dedicated pure-Rust Opus integration crate. |
| **ALAC** | Yes | `alac`, `isomp4` (or `all`) | Apple Lossless in MP4/M4A container. |
| **WMA** | **No** | — | Not supported by Symphonia; UI will clearly report WMA as unsupported. |

---

## 3. Metadata, Artwork, Local Scanning & Playlists

- **Metadata & Cover Art**: **`lofty` (`0.25.5`)** ([docs.rs/lofty](https://docs.rs/lofty)) — Pure Rust, unified tag reading/writing across ID3v1/v2, Vorbis Comments, MP4 atoms, FLAC pictures, and APE tags. Supports extracting embedded album art and writing tags on permitted downloads.
- **External Cover Art**: During folder scanning, check standard filenames (`cover.jpg/png`, `folder.jpg/png`, `front.jpg/png`, `album.jpg/png`) when embedded art is absent, caching resized thumbnails locally.
- **Local Music Scanning**: **`walkdir` (`2.5.1`)** + `tokio` background tasks + file size/mtime hashing to detect additions, modifications, missing files, and duplicates without blocking the UI.
- **Playlist Formats**:
  - **M3U / M3U8**: Plain-text line-based paths/URLs with `#EXTM3U` and `#EXTINF:<seconds>,<artist> - <title>` directives (UTF-8 for M3U8). Primary import/export standard.
  - **PLS**: INI-style (`[playlist]`, `File1=`, `Title1=`, `Length1=`, `NumberOfEntries=`). Supported for radio streams and legacy Winamp-style playlist compatibility.

---

## 4. Persistent Storage: SQLite (`rusqlite` vs `sqlx`)

- **Selected**: **`rusqlite` (`0.43.0`)** with `bundled` SQLite, **WAL mode**, and **FTS5** full-text search ([docs.rs/rusqlite](https://docs.rs/rusqlite)).
- **Rejected**: `sqlx` (`0.9.0`) — heavier compile times and async pool overhead not needed for single-user embedded desktop SQLite.
- **Design**: Store metadata, albums, artists, playlists, smart playlist rules, library folders, play history, download records, cache index, and non-secret settings in SQLite. Never store audio blobs in SQLite. Use numbered SQL migrations.

---

## 5. Frontend Framework & Tooling

| Option | Min. Installer | Runtime Model | Ecosystem | Verdict |
|---|---|---|---|---|
| **React 19 + TypeScript + Vite** | ~15–25 MB | VDOM + React Compiler | Unmatched (TanStack Virtual, dnd-kit, CodeMirror, Vitest) | **Selected** — Best ecosystem for complex desktop library grids, drag-and-drop playlists, CSS editor, and clean `hooks/` + `stores/` separation. |
| **Svelte 5** | ~9–14 MB | Runes (no VDOM) | Growing | Strong runner-up, smaller third-party desktop widget ecosystem. |
| **SolidJS** | ~8–12 MB | Fine-grained signals | Niche | Smallest bundle, fewer maintained UI/editor primitives. |

- **Package Manager**: **`pnpm` (`10.33.0`)** — fast, strict `node_modules`, already installed locally.
- **State & Performance**: **Zustand** for UI/player stores; **TanStack Virtual** for 10k+ track tables; **HTML5 Canvas / WebGL** driven by `requestAnimationFrame` + Rust FFT events outside React's render tree.

---

## 6. Online Music APIs, Lyrics & Compliance Summary

Full matrix in [PROVIDER_COMPATIBILITY.md](../providers/PROVIDER_COMPATIBILITY.md) and legal rules in [PLATFORM_RESTRICTIONS.md](PLATFORM_RESTRICTIONS.md).

- **Tier 1 (MVP Core)**: **Local Library** (full offline, metadata, art, playlists).
- **Tier 2 (MVP Online — Open & Compliant)**:
  - **Internet Archive** ([archive.org/developers](https://archive.org/developers/)): Open metadata/item APIs, free streaming & direct MP3/FLAC/OGG downloads.
  - **Radio Browser** ([api.radio-browser.info](https://api.radio-browser.info/)): Free, open directory of internet radio stations; requires descriptive `User-Agent` & click reporting.
  - **Direct Audio URLs / Podcast RSS**: User-supplied streams & open RSS feeds.
  - **Jamendo** ([developer.jamendo.com](https://developer.jamendo.com/)) & **Audius** ([docs.audius.org](https://docs.audius.org/)): Open CC / decentralized catalogs; strong Milestone 8/11 candidates.
- **Tier 3 (Optional / Restricted Official Integrations)**:
  - **YouTube** ([YouTube API ToS](https://developers.google.com/youtube/terms/api-services-terms-of-service)): Search via Data API v3 + **visible** IFrame Player API only. No audio-only/hidden playback, no background-play circumvention, no downloading, no offline audio caching.
  - **Spotify** ([Spotify Developer Policy](https://developer.spotify.com/policy)): 2026 Development Mode requires developer Premium, caps at **5 users**, throttles search to 10 results, and removed several catalog endpoints; Extended Quota requires a registered business + **250k MAU**; Web Playback SDK requires end-user Premium. Viable only as optional BYO-credentials metadata / Connect / external-handoff integration with explicit UI limitations.
- **Tier 4 (Not Viable / Deferred)**: SoundCloud (gated OAuth 2.1, downloads strictly prohibited via API), Deezer (30s free preview, Premium OAuth, no caching), Apple MusicKit (paid Apple Dev Program, strict monetization/App Store rules), Bandcamp (no public consumer API, scraping prohibited).
- **Lyrics**: **LRCLIB** ([lrclib.net/docs](https://lrclib.net/docs)) — No API key, requires identifying `User-Agent`, provides plain + synced LRC lyrics. Because lyrics are crowd-sourced copyrighted text, implement as an **optional, opt-in** feature with clear source attribution and local caching.

---

## 7. Caching, Downloads & Windows Integration

- **Download Manager**: Built on `reqwest` (`0.13.5`) streaming to `.part` temp files, atomic rename, SHA/size verification, concurrent queue limits, pause/resume (`Range` headers where supported), and `lofty` tag embedding. **Strictly gated by `ProviderCapabilities::supports_download`**.
- **Playback Cache**: Dedicated LRU disk cache with user-configured max size, expiration TTL, low-disk-space auto-eviction, and corruption recovery. Never presented as permanent downloads; disabled for providers prohibiting audio caching (e.g., YouTube, Spotify).
- **Windows Integration**:
  - **Media Keys & SMTC**: **`souvlaki` (`0.9.3`)** integrates with Windows System Media Transport Controls (lock screen, volume flyout, hardware media keys).
  - **Secure Credentials**: **`keyring` (`4.2.0`)** stores OAuth tokens and optional API keys in **Windows Credential Manager**—never plaintext in SQLite or config JSON.

---

## 8. Packaging, Installers, Updates, CI/CD & Licensing

- **Windows Packaging**:
  - **Primary**: **NSIS** (`-setup.exe`) via Tauri v2 bundler ([Tauri Windows Installer](https://v2.tauri.app/distribute/windows-installer/)), supporting per-user/per-machine install, custom branding, Start Menu/Desktop shortcuts, and WebView2 bootstrapper.
  - **Secondary**: **Portable ZIP** containing the release binary + app resources. (MSI via WiX v3 optional later for enterprise).
- **Auto-Updates**: `tauri-plugin-updater` (`2.x`) with signed update manifests hosted on GitHub Releases.
- **CI/CD & Website**: GitHub Actions (`windows-latest` MSVC runner) for `cargo fmt`, `cargo clippy`, `cargo test`, `pnpm lint`, `pnpm test`, tag-triggered release builds with SHA256 checksums, and automatic **GitHub Pages** deployment for the static website.
- **Theme & CSS Security**: Themes use semantic `--aq-*` CSS Custom Properties + validated JSON manifests. Advanced user CSS is injected into a dedicated `<style id="auraliq-user-css">` tag (never `eval` or arbitrary JS), protected by strict Tauri CSP (`default-src 'self'`, no inline scripts) and a one-click Safe Reset.
- **License**: **MIT License** — permissive, compatible with all selected Rust/JS dependencies (`symphonia` MPL-2.0 file-level, `cpal`/`tauri`/`rusqlite` Apache-2.0/MIT), and friendly to open-source contributors.
