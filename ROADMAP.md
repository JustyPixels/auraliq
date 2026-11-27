# Auraliq — Development Roadmap

> **Vision**: A retro-inspired unified music hub built with Rust + Tauri v2.  
> **Versioning**: Semantic Versioning (`0.1.0` → `1.0.0` MVP).

---

## Milestone 0 — Research & Feasibility (`0.0.0-research`) [COMPLETED]

- [x] Research Tauri v2, Windows MSVC vs GNU toolchain, capabilities, and WebView2
- [x] Research Rust audio stack (`symphonia`, `cpal`, `rubato`, `realfft`, `rodio`)
- [x] Research metadata (`lofty`), scanning (`walkdir`), and playlists (`M3U/M3U8/PLS`)
- [x] Research SQLite (`rusqlite` + WAL + FTS5) vs `sqlx`
- [x] Research frontend stack (React 19 + TS + Vite + `pnpm` + Zustand)
- [x] Research music providers, ToS, caching, and download legality (Local, Internet Archive, Radio Browser, Jamendo, Audius, YouTube, Spotify 2026 rules, SoundCloud, Deezer, Apple MusicKit, Bandcamp, LRCLIB)
- [x] Research Windows integration (`souvlaki`, `keyring`), NSIS/portable packaging, CI/CD, GitHub Pages, and MIT license
- [x] Create `RESEARCH_REPORT.md`, `ARCHITECTURE_PROPOSAL.md`, `PROVIDER_COMPATIBILITY.md`, `DEPENDENCY_ANALYSIS.md`, `PLATFORM_RESTRICTIONS.md`, `TECHNICAL_DECISIONS.md`, `ROADMAP.md`, `PROJECT_STATE.md`

---

## Milestone 1 — Repository & Project Foundation (`0.1.0`) [COMPLETED]

- [x] Create GitHub repository `JustyPixels/auraliq`
- [x] Pin `x86_64-pc-windows-msvc` via `rust-toolchain.toml` + local `rustup` override
- [x] Scaffold Tauri v2 + React 19 + TypeScript + Vite (`pnpm`)
- [x] Configure formatting, linting (`clippy`, `eslint`, `prettier`), and test runners (`cargo test`, `vitest`)
- [x] Configure GitHub Actions CI workflow
- [x] Add `README.md`, `LICENSE` (MIT), `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md`, issue/PR templates
- [x] Verify minimal Tauri app compiles and passes all checks on Windows x64 (`x86_64-pc-windows-msvc`)

---

## Milestone 2 — Auraliq Design System & Branding (`0.1.x`) [COMPLETED]

- [x] Design application icon, wordmark, compact logo, and GitHub banners (`branding/`)
- [x] Define retro design tokens (`--aq-*`), typography, and initial themes (Midnight Cassette, CRT Purple, Analog Amber, Retro Terminal, Classic Gray)
- [x] Build core retro UI primitives and main layout shell (sidebar, content area, optional right panel, bottom player bar)

---

## Milestone 3 — Core Application Shell (`0.1.x`) [COMPLETED]

- [x] Implement navigation (Home, Search, Discover, Library, Playlists, Downloads, Settings)
- [x] Implement customizable/collapsible/resizable sidebar and persistent layout settings
- [x] Implement theme switching, UI density, provider capability cards, and keyboard shortcuts foundation

---

## Milestone 4 — Local Music Engine (`0.2.0`) [COMPLETED]

- [x] Implement Rust audio engine (`symphonia` + `cpal` + stereo resampler)
- [x] Implement local folder management and background `walkdir` + `lofty` scanner
- [x] Extract embedded & external album artwork with local thumbnail cache
- [x] Build SQLite schema + FTS5 search + migrations
- [x] Implement Track, Album, Artist, Genre browsing, Favorites, Recently Played, Play Counts
- [x] Implement local playback, queue, playlists, M3U/M3U8/PLS import/export, and playback state persistence

---

## Milestone 5 — Player & Audio Experience (`0.3.0`) [COMPLETED]

- [x] Complete playback controls (play/pause/stop/prev/next/seek/volume/mute/shuffle/repeat)
- [x] Implement queue management (add, play next, reorder, clear, persist)
- [x] Integrate Windows SMTC & hardware media keys (`souvlaki`)
- [x] Implement audio output device selection and error recovery
- [x] Implement FFT tap (`realfft`) and Canvas audio visualizer foundation (`Bars`, `Scope`, `Cassette`)
- [x] Implement playback notifications (`PlaybackToast`)

---

## Milestone 6 — Unified Library & Search (`0.3.x`) [COMPLETED]

- [x] Implement unified search with source badges and filters
- [x] Implement non-destructive track identity matching (`track_identity_links`)
- [x] Implement duplicate detection, custom collections, smart playlists, and local Discover page

---

## Milestone 7 — Online Provider Framework (`0.4.0`) [COMPLETED]

- [x] Implement `MusicProvider` trait, `ProviderCapabilities`, and `ProviderRegistry`
- [x] Implement `keyring`-backed credential storage and SSRF/URL security validation
- [x] Implement HTTP stream playback readiness in `AudioEngine` and dynamic capability-driven Provider Settings UI

---

## Milestone 8 — First Online Integrations (`0.5.0`)

- [ ] Implement Internet Archive provider (search, metadata, stream, permitted download)
- [ ] Implement Radio Browser provider (search, click reporting, live stream)
- [ ] Implement Direct Audio URL / Podcast RSS provider
- [ ] Evaluate & integrate Jamendo / Audius (and optional compliant YouTube/Spotify if scoped)

---

## Milestone 9 — Download Manager & Cache (`0.6.0`)

- [ ] Implement source-aware download queue (pause, resume, retry, cancel, concurrency, naming rules, `lofty` tagging)
- [ ] Implement LRU temporary playback cache (size limit, expiration, cleanup, offline mode handling)

---

## Milestone 10 — Customization (`0.7.0`)

- [ ] Build theme editor (colors, typography, density, visualizers, animations)
- [ ] Build safe live CSS editor (`<style id="auraliq-user-css">`) + theme import/export + Safe Reset

---

## Milestone 11 — Additional Features (`0.8.0`)

- [ ] Optional opt-in LRCLIB synced/plain lyrics
- [ ] Equalizer, ReplayGain, crossfade, gapless playback, advanced CRT/cassette visualizers

---

## Milestone 12 — Website & Documentation (`0.8.x`)

- [ ] Build static retro project website (`website/`) with Downloads, Features, Roadmap, About, FAQ
- [ ] Configure automatic GitHub Pages deployment workflow
- [ ] Capture real application screenshots and update `README.md`

---

## Milestone 13 — QA, Optimization & Security (`0.9.0`)

- [ ] Full Rust, frontend, and integration test suite
- [ ] Security & dependency audit (`cargo audit`, CSP, path/URL validation)
- [ ] Performance profiling (idle CPU/RAM, scan speed, clean Windows VM install/upgrade/uninstall test)

---

## Milestone 14 — MVP Release (`1.0.0`)

- [ ] Tag release, run automated GitHub Release workflow (NSIS installer + Portable ZIP + SHA256 checksums)
- [ ] Verify clean-environment installation, local playback, online streaming, persistence, and uninstallation
- [ ] Publish release notes and live GitHub Pages site
