# Auraliq — Technical Decisions (ADRs)

Concise Architecture Decision Records established in Milestone 0.

---

### ADR-001: Desktop Framework — Tauri v2 (MSVC on Windows)
- **Context**: Need a lightweight, secure, retro-customizable desktop app for Windows 10/11 x64 with future Linux/macOS support.
- **Decision**: Use **Tauri v2 (`2.12.7`)** with the **`x86_64-pc-windows-msvc`** toolchain.
- **Alternatives**: Electron (100+ MB bundle, high RAM); GNU toolchain on Windows (unsupported by Tauri v2, breaks `WebView2LoaderStatic.lib` and NSIS/MSI bundling).
- **Consequences**: ~30–50 MB idle RAM, ~15–25 MB installer, strict capability-based IPC security; requires MSVC toolchain in dev & CI.

### ADR-002: Audio Engine — Direct `symphonia` + `cpal` + `rubato` + `realfft`
- **Context**: Need reliable local/stream decoding, sample-accurate seeking, output device selection, FFT data for visualizers, and future EQ/gapless/ReplayGain.
- **Decision**: Build a dedicated Rust audio engine using `symphonia` (`0.6.1`), `cpal` (`0.18.2`), `rubato` (`5.1.0`), and `realfft` (`3.5.0`).
- **Alternatives**: `rodio` (`0.21.0`) — simpler initially, but hides PCM buffers needed for FFT visualizers and custom DSP.
- **Consequences**: Full control over audio pipeline and thread isolation; WMA is not supported by Symphonia and will be documented as unsupported.

### ADR-003: Metadata & Artwork — `lofty`
- **Context**: Need unified tag reading/writing and embedded cover art extraction across MP3, FLAC, M4A, OGG, WAV, Opus, ALAC.
- **Decision**: Use `lofty` (`0.25.5`).
- **Alternatives**: Separate `id3`, `metaflac`, `mp4ameta` crates.
- **Consequences**: Single consistent API for both library scanning and permitted download tagging.

### ADR-004: Database — `rusqlite` (Bundled SQLite + WAL + FTS5)
- **Context**: Need fast local library queries, full-text search, playlists, history, and zero external DB dependencies.
- **Decision**: Use `rusqlite` (`0.43.0`, `bundled` feature) with WAL mode and FTS5.
- **Alternatives**: `sqlx` (`0.9.0`) — heavier compile times and async pool complexity unnecessary for embedded desktop SQLite.
- **Consequences**: Zero runtime DLLs, instant FTS5 search, clean numbered SQL migrations.

### ADR-005: Frontend Stack — React 19 + TypeScript + Vite + `pnpm` + Zustand
- **Context**: Need a responsive, customizable UI with virtualized 10k+ track tables, drag-and-drop playlists, and a CSS/theme editor.
- **Decision**: Use React 19 + TypeScript + Vite + `pnpm` + Zustand + TanStack Virtual + Canvas visualizers.
- **Alternatives**: Svelte 5, SolidJS.
- **Consequences**: Largest library ecosystem for complex desktop UI; Canvas visualizers and Rust audio stay outside React's render loop for 60fps performance.

### ADR-006: Theme & User CSS Customization Engine
- **Context**: Deep UI customization is a core selling point, but user styles must never compromise security or brick navigation.
- **Decision**: Semantic `--aq-*` CSS Custom Properties + exportable JSON theme manifests + scoped `<style id="auraliq-user-css">` under strict Tauri CSP, with one-click Safe Reset.
- **Alternatives**: Arbitrary user JS plugins (security risk).
- **Consequences**: Safe live CSS preview and full theme portability without RCE risk.

### ADR-007: MVP Online Provider Priority
- **Context**: Major commercial platforms (Spotify 2026 rules, YouTube, SoundCloud) heavily restrict third-party playback, caching, and downloads.
- **Decision**: Prioritize **Local Library** (Tier 1) + **Internet Archive, Radio Browser, Direct Audio URLs** (Tier 2 MVP online), followed by Jamendo/Audius, and optional compliant YouTube IFrame / Spotify Connect/metadata.
- **Alternatives**: Relying on Spotify/YouTube as primary MVP sources (blocked by ToS/user caps).
- **Consequences**: Real, legal, 100% functional MVP without fake buttons or ToS violations.

### ADR-008: Windows System Integration — `souvlaki` & `keyring`
- **Context**: Need native Windows media keys/SMTC and secure token storage.
- **Decision**: Use `souvlaki` (`0.9.3`) for SMTC/media keys and `keyring` (`4.2.0`) for Windows Credential Manager.
- **Alternatives**: Plaintext/encrypted JSON files or raw WinRT calls.
- **Consequences**: Native Windows media overlay and OS-protected secrets.

### ADR-009: Non-Destructive Unified Track Identity
- **Context**: Same song may exist locally and on online providers, but live/remix/cover versions must never be silently merged.
- **Decision**: Store source-specific tracks separately; link probable matches in `track_identity_links` via normalized title/artist + duration tolerance with optional user confirmation.
- **Consequences**: Clean cross-source discovery without corrupting distinct recordings.

### ADR-010: Windows Packaging & Updates — NSIS + Portable ZIP + `tauri-plugin-updater`
- **Context**: MVP must ship a real Windows installer with no manual dev-tool prerequisites.
- **Decision**: Primary NSIS (`-setup.exe`) installer with WebView2 bootstrapper, secondary Portable ZIP, and signed GitHub Release updates via `tauri-plugin-updater`.
- **Consequences**: Zero-prerequisite user installation on Windows 10/11 x64.

### ADR-011: Optional Opt-In Lyrics — LRCLIB
- **Context**: Users want synced lyrics without scraping copyrighted sites.
- **Decision**: Integrate LRCLIB (`lrclib.net`) as an optional, opt-in feature with proper `User-Agent` and source attribution.
- **Consequences**: Compliant synced/plain lyrics with zero API key friction.

### ADR-012: Open-Source License — MIT
- **Context**: Need a permissive, contributor-friendly license compatible with all dependencies.
- **Decision**: Adopt the **MIT License**.
- **Consequences**: Maximum compatibility and clear open-source governance.
