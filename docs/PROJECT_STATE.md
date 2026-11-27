# Auraliq — Project State

> **Read this file first before starting any new work session.**

## Current Status
- **Current Milestone**: Milestone 6 — Unified Library & Search (**COMPLETED**)
- **Next Milestone**: Milestone 7 — Online Provider Framework (`0.4.0`)
- **Current Version**: `0.3.1`
- **Repository Status**: `https://github.com/JustyPixels/auraliq` (`main`)

## What Is Completed
- **Milestones 0–5**: Research, Tauri v2 + React 19 foundation, brand assets, retro design system, 5 themes, persistent customizable shell, SQLite + FTS5 local music engine, `lofty` metadata/artwork, `symphonia` + `cpal` playback, Windows SMTC (`souvlaki`), `realfft` Canvas visualizer, playback toasts.
- **Milestone 6**:
  - Fixed Rust 1.100.0 CI Clippy lints (`needless_range_loop` in `audio/fft.rs`, `chunks_exact_to_as_chunks` in `audio/mod.rs`).
  - `src-tauri/src/metadata/identity.rs`: Normalized track fingerprinting, strict version/duration compatibility guard, duplicate grouping, identity link suggestions, smart playlist rule evaluator.
  - `src-tauri/src/database/migrations.rs` (v2): `smart_playlists` (seeded with `Favorites`, `Most Played`, `Never Played`), `collections`, `collection_tracks`, `track_identity_links`.
  - Frontend: `SearchPage` filters (source, genre, duration, favorites), `LibraryShellPage` (`Genres`, `Collections`, `Duplicates`, `Track Matches` tabs), `PlaylistsPage` (`Smart Playlists` builder), and `DiscoverPage` (local discovery + Shuffle 10 Random).

## What Is Currently Working
- Full local library, unified identity matching, duplicate inspection, smart playlists, custom collections, filtered search, and local discovery.
- All frontend (`prettier`, `eslint`, `tsc`, `vitest`, `vite build`) and Rust (`rustfmt`, `clippy`, `cargo test`) checks pass.

## What Is Currently Being Developed
- Nothing actively in flight; ready to begin Milestone 7.

## Outstanding Issues & Environment Notes
1. **Windows Rust Toolchain**: Local `rustup override set stable-x86_64-pc-windows-msvc` is active; always prepend `$env:USERPROFILE\.cargo\bin` to `PATH` before running `cargo` / `rustc` / `pnpm tauri`.
2. **`frontendDist` Requirement**: Run `pnpm build` before `cargo clippy` / `cargo test`.
3. **Rust 1.100.0 CI**: GitHub Actions runs newer Clippy lints than local 1.96.0 — avoid index range loops and `.chunks_exact(CONST)`.

## Known Bugs
- None.

## Key Architectural Decisions
- See [TECHNICAL_DECISIONS.md](architecture/TECHNICAL_DECISIONS.md) (ADR-001 through ADR-012).

## Next Concrete Task
Execute **Milestone 7 — Online Provider Framework (`0.4.0`)**:
1. Add `reqwest` (`0.13.5`) and `keyring` (`4.2.0`) to `src-tauri/Cargo.toml`.
2. Implement `MusicProvider` trait, `ProviderCapabilities` profile, `ProviderRegistry`, and `ProviderStatus` (`src-tauri/src/providers/`).
3. Implement Windows Credential Manager secret storage wrapper (`src-tauri/src/security/`).
4. Wire provider status/auth/search/stream/download IPC commands and dynamic capability-driven UI in Settings -> Providers.

## Relevant Commands
```powershell
$env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check && cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings && cargo test --manifest-path src-tauri/Cargo.toml
```
