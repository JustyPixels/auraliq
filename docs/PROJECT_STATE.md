# Auraliq — Project State

> **Read this file first before starting any new work session.**

## Current Status
- **Current Milestone**: Milestone 9 — Download Manager & Cache (**COMPLETED**)
- **Next Milestone**: Milestone 10 — Customization (`0.7.0`)
- **Current Version**: `0.6.0`
- **Repository Status**: `https://github.com/JustyPixels/auraliq` (`main`)

## What Is Completed
- **Milestones 0–8**: Research, Tauri v2 + React 19 foundation, brand assets, retro design system, 5 themes, persistent customizable shell, SQLite + FTS5 local music engine, `lofty` metadata/artwork, `symphonia` + `cpal` playback, Windows SMTC (`souvlaki`), `realfft` Canvas visualizer, track identity matching, smart playlists, collections, `ProviderRegistry`, `keyring` credentials, SSRF URL validation, Audius, Internet Archive, Radio Browser, Direct URLs, and BYOK Jamendo/Freesound/YouTube.
- **Milestone 9**:
  - Source-aware Download Manager (`src-tauri/src/downloads/`) with SQLite v4 `downloads` & `download_settings`, HTTP `Range` resume, pause/resume/retry/cancel, concurrency 1–4, sanitized naming templates, `lofty` auto-tagging, and auto-library import.
  - Temporary LRU Playback Cache (`src-tauri/src/cache/`) with `cache_entries` & `cache_settings`, max size/TTL eviction, background stream caching for `offline_cache_allowed` providers, and Offline Mode.
  - `DownloadsPage`, `SearchPage` permitted download buttons, and `AppShell` Offline Mode badge.

## What Is Currently Working
- Full offline local library + zero-key & BYOK online streaming + permitted downloads + LRU stream cache with Offline Mode.
- All frontend (`prettier`, `eslint`, `tsc`, `vitest`, `vite build`) and Rust (`rustfmt`, `clippy`, `cargo test`) checks pass.

## What Is Currently Being Developed
- Nothing actively in flight; ready to begin Milestone 10.

## Outstanding Issues & Environment Notes
1. **Windows Rust Toolchain**: Local `rustup override set stable-x86_64-pc-windows-msvc` is active; always prepend `$env:USERPROFILE\.cargo\bin` to `PATH` before running `cargo` / `rustc` / `pnpm tauri`.
2. **`frontendDist` Requirement**: Run `pnpm build` before `cargo clippy` / `cargo test`.
3. **Rust 1.100.0 CI**: Avoid index range loops, `.chunks_exact(CONST)`, and `if cond { return false; } true`.

## Known Bugs
- None.

## Key Architectural Decisions
- See [TECHNICAL_DECISIONS.md](architecture/TECHNICAL_DECISIONS.md) (ADR-001 through ADR-012).

## Next Concrete Task
Execute **Milestone 10 — Customization (`0.7.0`)**:
1. Theme editor (colors, typography, density, visualizers, animations).
2. Safe live CSS editor (`<style id="auraliq-user-css">`) + theme import/export + Safe Reset.

## Relevant Commands
```powershell
$env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check && cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings && cargo test --manifest-path src-tauri/Cargo.toml
```
