# Changelog

All notable changes to **Auraliq** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-27

### Added

- **Milestone 14 (MVP Release)**:
  - Automated GitHub Release workflow (`.github/workflows/release.yml`) producing `Auraliq_1.0.0_x64-setup.exe` (NSIS current-user installer), `Auraliq_1.0.0_x64-portable.zip`, and `SHA256SUMS.txt`.
  - Release notes (`docs/releases/v1.0.0.md`) and live `v1.0.0` download links on `website/index.html` and `README.md`.

## [0.9.0] - 2026-11-27

### Security

- Upgraded `rusqlite` (`0.35` -> `0.43`, bundling `libsqlite3-sys 0.40.0`) to resolve `RUSTSEC-2026-0459` (0 vulnerabilities in `cargo audit`).
- Upgraded `vitest` (`3.2.7` -> `4.1.12`) to resolve `tinypool` / `@vitest/mocker` dev-dependency advisories (0 vulnerabilities in `pnpm audit`).
- Hardened `validate_remote_url` against embedded `@` credentials and `.internal` hostnames, and hardened `sanitize_filename` against Windows reserved device names (`CON`, `PRN`, `AUX`, `NUL`, `COM1–9`, `LPT1–9`) and trailing dots/spaces.

### Changed

- Reduced idle/paused audio worker thread CPU wakeups by blocking on `rx.recv_timeout(150ms)` when not playing.
- Wrapped folder scans in `Database::with_batch_transaction` for single-commit WAL performance.

### Added

- End-to-end Rust integration test suite (`src-tauri/tests/integration_pipeline.rs`) and QA/Security audit report (`docs/QA_SECURITY_AUDIT.md`).

## [0.8.1] - 2026-11-27

### Added

- **Milestone 12 (Website & Documentation)**:
  - Built static 1990s retro purplish project website (`website/index.html`, `website/styles.css`, `website/app.js`) with Downloads, Features, Supported Music Sources, Roadmap, About, FAQ, interactive theme preview, and CRT scanlines toggle.
  - Added automated GitHub Pages deployment workflow (`.github/workflows/pages.yml`).
  - Captured real application screenshot (`docs/screenshots/auraliq-home.png`) and updated `README.md` and `ROADMAP.md`.

## [0.8.0] - 2026-11-27

### Added

- **Milestone 11 (Additional Features)**:
  - **5-Band Graphic Equalizer & ReplayGain DSP** (`src-tauri/src/audio/dsp.rs`): Stereo biquad IIR filters (60 Hz, 230 Hz, 910 Hz, 3.6 kHz, 14 kHz), preamp, 6 EQ presets, ReplayGain tag parsing (`lofty`), **Gapless Playback** preloading, and configurable **Crossfade** (`0–8s`).
  - **Optional Opt-In Lyrics** (`src-tauri/src/lyrics/`): Offline local `.lrc` sidecar loading plus opt-in LRCLIB synced/plain lyrics with SQLite caching (migration v5) and click-to-seek `LyricsPanel` in `RightPanel`.
  - **Advanced Retro Visualizers**: Segmented 90s LED Bars, CRT graticule Scope, dual-VU Cassette Deck, **Dual Analog VU Meters**, and **CRT Matrix**.

## [0.7.0] - 2026-11-27

### Changed

- **1990s Retro Purplish UI Overhaul**:
  - Removed rounded borders (`border-radius: 0px`) across all presets, panels, buttons, badges, inputs, modals, and track rows.
  - Added authentic 1990s raised/sunken 3D hardware bevels, gradient panel titlebars (`--aq-titlebar-bg`), square LEDs, chunky fader sliders, and purple CRT scanlines while preserving Auraliq's signature purple palette.

### Added

- **Milestone 10 (Customization)**:
  - Live **Theme Editor** (`src/components/ThemeEditor.tsx`) with 10-color palette overrides, 4 typography presets (`Classic 90s`, `Monospace CRT`, `System Clean`, `Retro Terminal`), Bevel Style (`90s 3D Bevel` / `Flat Pixel`), CRT Scanline intensity slider, UI density, visualizer style, and reduced motion controls.
  - **Safe Live CSS Editor** (`src/components/CustomCssEditor.tsx`, `src/themes/userCss.ts`) injecting sanitized local-only CSS into `<style id="auraliq-user-css">` (blocking `@import`, external `url()`, `expression()`, `javascript:`, and `</style>`), with an instant kill-switch and starter snippets.
  - JSON **Theme Import / Export** (`src/themes/serialization.ts`) and one-click **Safe Reset All**.

## [0.6.0] - 2026-11-27

### Added

- **Milestone 9 (Download Manager & Cache)**:
  - Source-aware Download Manager (`src-tauri/src/downloads/`) strictly gated by `capabilities().download` and `track.downloadable` (Internet Archive, CC-permitted Jamendo tracks), with SQLite persistence (migration v4), HTTP `Range` resume via `.part` files, pause/resume/retry/cancel, configurable concurrency (1–4), sanitized naming templates, `lofty` metadata tagging, and auto-add to local library.
  - Strictly separated LRU Temporary Playback Cache (`src-tauri/src/cache/`) gated by `capabilities().offline_cache_allowed`, with configurable max size, TTL expiration, automatic LRU/orphan cleanup, and **Offline Mode** enforcement.
  - Live `DownloadsPage`, permitted download buttons in `SearchPage`, and `Offline Mode` status badge in `AppShell`.

## [0.5.0] - 2026-11-27

### Added

- **Milestone 8 (First Online Integrations)**:
  - Zero-config online music providers: **Audius** (trending + search + 320kbps streaming), **Internet Archive** (open archival audio search + stream resolution), **Radio Browser** (global radio directory + click reporting), and **Direct Audio URLs**.
  - Bring-Your-Own-Key (BYOK) providers stored securely in Windows Credential Manager (`keyring`): **Jamendo** (CC catalog), **Freesound** (CC ambient/synth audio), and **YouTube** (Data API v3 search + external watch handoff).
  - Updated `DiscoverPage` with `Online Stream Deck` (Audius Trending, Top Live Radio, Direct URL player) and `SearchPage` with live online & BYOK search tabs.

## [0.4.0] - 2026-11-27

### Added

- **Milestone 7 (Online Provider Framework)**:
  - Modular `MusicProvider` trait, `ProviderCapabilities`, and `ProviderRegistry` (`src-tauri/src/providers/`).
  - Windows Credential Manager secret storage (`keyring`) and SSRF/URL/filename security validation (`src-tauri/src/security/`).
  - SQLite migration v3 (`provider_settings`) and HTTP audio stream playback readiness (`load_and_play_url`) in `AudioEngine`.
  - Dynamic capability-driven Provider Settings UI (`useProvidersStore`, live Enable/Disable toggles, keyring credential fields).

## [0.3.1] - 2026-11-27

### Added

- **Milestone 6 (Unified Library & Search)**:
  - Non-destructive track identity matching (`metadata/identity.rs`, `track_identity_links`) preserving live/remix/cover/explicit distinctions and duration tolerance.
  - Duplicate recording detection (`Duplicates` tab) and user-confirmable `Track Matches` tab.
  - Smart playlists (`Favorites`, `Most Played`, `Never Played` + custom rule builder) and custom Collections.
  - Filtered Search (source, genre, duration, favorites) and honest local `DiscoverPage`.

### Fixed

- Resolved Rust 1.100.0 Clippy lints (`needless_range_loop` in `audio/fft.rs` and `chunks_exact_to_as_chunks` in `audio/mod.rs`).

## [0.3.0] - 2026-11-27

### Added

- **Milestone 5 (Player & Audio Experience)**:
  - Windows SMTC & hardware media key integration via `souvlaki` (`Play`, `Pause`, `Toggle`, `Next`, `Previous`, `Stop`).
  - CPAL audio output device enumeration, selection in Settings -> Playback, and automatic stream error recovery.
  - Real-time 512-point `realfft` spectrum & waveform analyzer feeding the Canvas `AudioVisualizer` (`Retro Bars`, `CRT Oscilloscope`, `Cassette Reels`, Low-Performance mode).
  - Queue item reordering (`Move Up` / `Move Down`), Stop transport control, and unobtrusive Now Playing / error toast notifications (`PlaybackToast`).

## [0.2.0] - 2026-11-27

### Added

- **Milestone 4 (Local Music Engine)**:
  - Thread-isolated Rust audio engine (`symphonia` + `cpal` + stereo linear resampler) with play, pause, resume, stop, seek, volume, mute, and clean WMA rejection.
  - SQLite (`rusqlite` bundled, WAL mode, FTS5 full-text search) schema & migrations (`library_folders`, `tracks`, `tracks_fts`, `playlists`, `playlist_tracks`, `playback_history`, `playback_state`).
  - Background recursive folder scanner (`walkdir`) with `lofty` metadata & embedded/external cover art caching.
  - M3U/M3U8/PLS playlist import/export and persistent playback queue/position/repeat/shuffle state.
  - Full frontend wiring for Library, Playlists, Search, Home, RightPanel, and live PlayerBar.

## [0.1.0] - 2026-11-27

### Added

- **Milestone 0**: Completed feasibility research, architecture proposal, provider compatibility matrix, dependency analysis, platform restrictions compliance guide, ADRs, and development roadmap.
- **Milestone 1**: Initialized Tauri v2 + Rust + React 19 + TypeScript + Vite (`pnpm`) foundation, Vitest/ESLint/Prettier/Clippy/Rustfmt checks, GitHub Actions CI workflow, MIT license, security policy, contributing guide, and build documentation.
