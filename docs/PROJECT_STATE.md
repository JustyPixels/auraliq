# Auraliq — Project State

> **Read this file first before starting any new work session.**

## Current Status
- **Current Milestone**: Milestone 7 — Online Provider Framework (**COMPLETED**)
- **Next Milestone**: Milestone 8 — First Online Integrations (`0.5.0`)
- **Current Version**: `0.4.0`
- **Repository Status**: `https://github.com/JustyPixels/auraliq` (`main`)

## What Is Completed
- **Milestones 0–6**: Research, Tauri v2 + React 19 foundation, brand assets, retro design system, 5 themes, persistent customizable shell, SQLite + FTS5 local music engine, `lofty` metadata/artwork, `symphonia` + `cpal` playback, Windows SMTC (`souvlaki`), `realfft` Canvas visualizer, track identity matching, smart playlists, collections, local Discover.
- **Milestone 7**:
  - `src-tauri/src/security/`: SSRF-safe URL validation (`validate_remote_url`), `sanitize_filename`, and Windows Credential Manager (`keyring` `3.6.3`) secret storage.
  - `src-tauri/src/providers/`: `MusicProvider` trait, `ProviderCapabilities`, `ProviderRegistry`, and capability-gated IPC commands (`list_providers`, `set_provider_enabled`, `save_provider_credential`, `clear_provider_credential`, `search_provider`, `play_online_track`).
  - `src-tauri/src/audio/mod.rs`: `load_and_play_url` HTTP stream decoding via `reqwest` blocking + Symphonia `ReadOnlySource`.
  - `src-tauri/src/database/migrations.rs` (v3): `provider_settings`.
  - Frontend: `useProvidersStore` + dynamic capability-driven `Settings -> Providers` UI with keyring credential inputs.

## What Is Currently Working
- Full local music engine + provider framework, Windows Credential Manager integration, SSRF URL validation, and HTTP audio stream playback foundation.
- All frontend (`prettier`, `eslint`, `tsc`, `vitest`, `vite build`) and Rust (`rustfmt`, `clippy`, `cargo test`) checks pass.

## What Is Currently Being Developed
- Nothing actively in flight; ready to begin Milestone 8.

## Outstanding Issues & Environment Notes
1. **Windows Rust Toolchain**: Local `rustup override set stable-x86_64-pc-windows-msvc` is active; always prepend `$env:USERPROFILE\.cargo\bin` to `PATH` before running `cargo` / `rustc` / `pnpm tauri`.
2. **`frontendDist` Requirement**: Run `pnpm build` before `cargo clippy` / `cargo test`.
3. **Rust 1.100.0 CI**: Avoid index range loops, `.chunks_exact(CONST)`, and `if cond { return false; } true`.

## Known Bugs
- None.

## Key Architectural Decisions
- See [TECHNICAL_DECISIONS.md](architecture/TECHNICAL_DECISIONS.md) (ADR-001 through ADR-012).

## Next Concrete Task
Execute **Milestone 8 — First Online Integrations (`0.5.0`)**:
1. Implement live **Internet Archive** provider (search + metadata + playable MP3/FLAC/OGG stream URLs).
2. Implement live **Audius** provider (discovery host lookup + trending/search + free 320kbps streaming so the app plays real online music out of the box without requiring user files or accounts).
3. Implement live **Radio Browser** provider (station search + click reporting + live radio stream playback).
4. Implement **Direct Audio URLs** playback in UI (`Online Sources` / `SearchPage` / `DiscoverPage` with source badges).

## Relevant Commands
```powershell
$env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check && cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings && cargo test --manifest-path src-tauri/Cargo.toml
```
