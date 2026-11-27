# Changelog

All notable changes to **Auraliq** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
