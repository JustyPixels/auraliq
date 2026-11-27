# Changelog

All notable changes to **Auraliq** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
