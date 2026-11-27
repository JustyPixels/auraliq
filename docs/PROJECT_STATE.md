# Auraliq — Project State

> **Read this file first before starting any new work session.**

## Current Status
- **Current Milestone**: Milestone 4 — Local Music Engine (**COMPLETED**)
- **Next Milestone**: Milestone 5 — Player & Audio Experience (`0.3.0`)
- **Current Version**: `0.2.0`
- **Repository Status**: `https://github.com/JustyPixels/auraliq` (`main`)

## What Is Completed
- **Milestones 0–3**: Research, Tauri v2 + React 19 foundation, brand assets, retro design system, 5 themes, persistent customizable shell & shortcuts.
- **Milestone 4**:
  - `src-tauri/src/database/`: SQLite (`rusqlite` bundled, WAL, FTS5) with migrations, folders, tracks, playlists, history, and playback state persistence.
  - `src-tauri/src/metadata/` & `src-tauri/src/library/`: `walkdir` + `lofty` scanner, embedded/external artwork cache (`$APPLOCALDATA/artwork/`), missing-file detection, M3U/M3U8/PLS import/export.
  - `src-tauri/src/audio/`: Thread-isolated `symphonia` + `cpal` + stereo resampler engine.
  - Frontend wiring: `src/api/backend.ts`, `useLibraryStore`, `usePlayerStore`, live `PlayerBar`, `RightPanel` Queue/Info, `LibraryShellPage`, `PlaylistsPage`, `SearchPage`, `HomePage`.

## What Is Currently Working
- Full offline local music scanning, FTS5 search, artwork display, playback, queue, playlists, and persistent state.
- All frontend (`prettier`, `eslint`, `tsc`, `vitest`, `vite build`) and Rust (`rustfmt`, `clippy`, `cargo test`) checks pass.

## What Is Currently Being Developed
- Nothing actively in flight; ready to begin Milestone 5.

## Outstanding Issues & Environment Notes
1. **Windows Rust Toolchain**: Local `rustup override set stable-x86_64-pc-windows-msvc` is active; always prepend `$env:USERPROFILE\.cargo\bin` to `PATH` before running `cargo` / `rustc` / `pnpm tauri`.
2. **`frontendDist` Requirement**: Run `pnpm build` before `cargo clippy` / `cargo test`.

## Known Bugs
- None.

## Key Architectural Decisions
- See [TECHNICAL_DECISIONS.md](architecture/TECHNICAL_DECISIONS.md) (ADR-001 through ADR-012).

## Next Concrete Task
Execute **Milestone 5 — Player & Audio Experience (`0.3.0`)**:
1. Integrate Windows SMTC & hardware media keys (`souvlaki`).
2. Implement audio output device enumeration and selection (`cpal`).
3. Implement FFT tap (`realfft`) and Canvas audio visualizer foundation (`Scope` tab).
4. Add playback notifications and enhanced audio device error recovery.

## Relevant Commands
```powershell
$env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check && cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings && cargo test --manifest-path src-tauri/Cargo.toml
```
