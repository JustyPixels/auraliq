# Auraliq — Project State

> **Read this file first before starting any new work session.**

## Current Status
- **Current Milestone**: Milestone 5 — Player & Audio Experience (**COMPLETED**)
- **Next Milestone**: Milestone 6 — Unified Library & Search (`0.3.x`)
- **Current Version**: `0.3.0`
- **Repository Status**: `https://github.com/JustyPixels/auraliq` (`main`)

## What Is Completed
- **Milestones 0–4**: Research, Tauri v2 + React 19 foundation, brand assets, retro design system, 5 themes, persistent customizable shell, SQLite + FTS5 local music engine, `lofty` metadata/artwork, `symphonia` + `cpal` playback, M3U/PLS playlists.
- **Milestone 5**:
  - `src-tauri/src/platform/media_keys.rs`: Windows SMTC & hardware media keys (`souvlaki`) emitting `auraliq://media-control` events.
  - `src-tauri/src/audio/fft.rs` & `audio/mod.rs`: 512-point `realfft` spectrum/waveform analyzer, CPAL output device enumeration/selection, automatic stream disconnect recovery.
  - `src/visualizers/AudioVisualizer.tsx`: Canvas visualizer (`Retro Bars`, `CRT Oscilloscope`, `Cassette Reels`, Low-Performance mode) in `RightPanel` `Scope` tab.
  - `src/components/PlaybackToast.tsx`, queue reordering (`moveQueueItem`), `Stop` button, and `Settings -> Playback` tab.

## What Is Currently Working
- Full local playback, Windows SMTC, device switching, real-time Canvas visualizers, queue management, and playback toasts.
- All frontend (`prettier`, `eslint`, `tsc`, `vitest`, `vite build`) and Rust (`rustfmt`, `clippy`, `cargo test`) checks pass.

## What Is Currently Being Developed
- Nothing actively in flight; ready to begin Milestone 6.

## Outstanding Issues & Environment Notes
1. **Windows Rust Toolchain**: Local `rustup override set stable-x86_64-pc-windows-msvc` is active; always prepend `$env:USERPROFILE\.cargo\bin` to `PATH` before running `cargo` / `rustc` / `pnpm tauri`.
2. **`frontendDist` Requirement**: Run `pnpm build` before `cargo clippy` / `cargo test`.

## Known Bugs
- None.

## Key Architectural Decisions
- See [TECHNICAL_DECISIONS.md](architecture/TECHNICAL_DECISIONS.md) (ADR-001 through ADR-012).

## Next Concrete Task
Execute **Milestone 6 — Unified Library & Search (`0.3.x`)**:
1. Non-destructive unified track identity matching (`track_identities` / `track_identity_links` distinguishing live/remix/cover/explicit versions).
2. Duplicate detection view in Local Library.
3. Smart playlists (rule-based queries: genre, artist, favorites, play count, recently played, never played) and custom collections.
4. Enhanced unified Search with source badges, duration/genre/artist filters, and virtualized track lists (`@tanstack/react-virtual`).

## Relevant Commands
```powershell
$env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check && cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings && cargo test --manifest-path src-tauri/Cargo.toml
```
