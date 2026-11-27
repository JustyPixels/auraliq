# Auraliq — Project State

> **Read this file first before starting any new work session.**

## Current Status
- **Current Milestone**: Milestone 8 — First Online Integrations (**COMPLETED**)
- **Next Milestone**: Milestone 9 — Download Manager & Cache (`0.6.0`)
- **Current Version**: `0.5.0`
- **Repository Status**: `https://github.com/JustyPixels/auraliq` (`main`)

## What Is Completed
- **Milestones 0–7**: Research, Tauri v2 + React 19 foundation, brand assets, retro design system, 5 themes, persistent customizable shell, SQLite + FTS5 local music engine, `lofty` metadata/artwork, `symphonia` + `cpal` playback, Windows SMTC (`souvlaki`), `realfft` Canvas visualizer, track identity matching, smart playlists, collections, `ProviderRegistry`, `keyring` credentials, SSRF URL validation.
- **Milestone 8**:
  - Live zero-config online music: `audius.rs` (trending + search + 320kbps streaming), `internet_archive.rs`, `radio_browser.rs`, and Direct Audio URL playback.
  - Live BYOK providers (`keyring`): `jamendo.rs` (Client ID), `freesound.rs` (API Key), and `youtube.rs` (Data API v3 search + external watch handoff).
  - `DiscoverPage` Online Stream Deck + `SearchPage` online & BYOK search tabs + `usePlayerStore.playOnlineTrackList`.

## What Is Currently Working
- Out-of-the-box online streaming (Audius Trending, Radio Browser, Internet Archive, Direct URLs) + BYOK catalogs + full offline local music engine.
- All frontend (`prettier`, `eslint`, `tsc`, `vitest`, `vite build`) and Rust (`rustfmt`, `clippy`, `cargo test`) checks pass.

## What Is Currently Being Developed
- Nothing actively in flight; ready to begin Milestone 9.

## Outstanding Issues & Environment Notes
1. **Windows Rust Toolchain**: Local `rustup override set stable-x86_64-pc-windows-msvc` is active; always prepend `$env:USERPROFILE\.cargo\bin` to `PATH` before running `cargo` / `rustc` / `pnpm tauri`.
2. **`frontendDist` Requirement**: Run `pnpm build` before `cargo clippy` / `cargo test`.
3. **Rust 1.100.0 CI**: Avoid index range loops, `.chunks_exact(CONST)`, and `if cond { return false; } true`.

## Known Bugs
- None.

## Key Architectural Decisions
- See [TECHNICAL_DECISIONS.md](architecture/TECHNICAL_DECISIONS.md) (ADR-001 through ADR-012).

## Next Concrete Task
Execute **Milestone 9 — Download Manager & Cache (`0.6.0`)**:
1. Source-aware Download Manager (`src-tauri/src/downloads/`) gated strictly by `capabilities().download == true` (Internet Archive, Jamendo CC-permitted tracks), with queue, pause/resume/retry/cancel, atomic `.part` writes, `lofty` metadata tagging, and `downloads` SQLite history.
2. Temporary LRU Playback Cache (`src-tauri/src/cache/`) gated by `capabilities().offline_cache_allowed == true`, with max size, TTL expiration, and one-click clear cache.
3. Wire `DownloadsPage.tsx` and `Settings -> Storage & Cache` UI.

## Relevant Commands
```powershell
$env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check && cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings && cargo test --manifest-path src-tauri/Cargo.toml
```
