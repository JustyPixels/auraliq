# Auraliq — Project State

> **Read this file first before starting any new work session.**

## Current Status
- **Current Milestone**: Milestone 14 — MVP Release (**COMPLETED**)
- **Next Milestone**: Post-MVP Maintenance & Cross-Platform Roadmap
- **Current Version**: `1.0.0`
- **Repository Status**: `https://github.com/JustyPixels/auraliq` (`main`, tag `v1.0.0`)

## What Is Completed
- **Milestones 0–14 (Full MVP)**: Research, Tauri v2 + React 19 foundation, brand assets, 1990s retro purplish deck UI, Theme Editor + Safe Live CSS + JSON import/export, persistent customizable shell, SQLite + FTS5 local music engine, `lofty` metadata/artwork, `symphonia` + `cpal` playback, Windows SMTC, `realfft` visualizers, track identity matching, smart playlists, collections, `ProviderRegistry`, `keyring` credentials, SSRF/filename hardening, Audius, Internet Archive, Radio Browser, Direct URLs, BYOK Jamendo/Freesound/YouTube, Download Manager, LRU Playback Cache, 5-band biquad EQ + ReplayGain + Gapless + Crossfade, opt-in LRCLIB / local `.lrc` lyrics, static retro website (`website/`), automated GitHub Pages deployment, 0-vulnerability security audit (`cargo audit` & `pnpm audit`), and automated `v1.0.0` Windows NSIS + Portable ZIP + SHA-256 GitHub Release pipeline.

## What Is Currently Working
- Full `v1.0.0` MVP desktop application, live GitHub Pages site (`https://justypixels.github.io/auraliq/`), and automated CI + Release pipelines.

## What Is Currently Being Developed
- MVP complete (`1.0.0`).

## Outstanding Issues & Environment Notes
1. **Windows Rust Toolchain**: Local `rustup override set stable-x86_64-pc-windows-msvc` is active; always prepend `$env:USERPROFILE\.cargo\bin` to `PATH` before running `cargo` / `rustc` / `pnpm tauri`.
2. **`frontendDist` Requirement**: Run `pnpm build` before `cargo clippy` / `cargo test`.
3. **Rust 1.100.0 CI**: Avoid index range loops, `.chunks_exact(CONST)`, and `if cond { return false; } true`.

## Known Bugs
- None.

## Key Architectural Decisions
- See [TECHNICAL_DECISIONS.md](architecture/TECHNICAL_DECISIONS.md) (ADR-001 through ADR-012).

## Next Concrete Task
Post-MVP (`1.0.0+`): Monitor release feedback, plan Linux/macOS targets and expanded optional provider integrations.

## Relevant Commands
```powershell
$env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check && cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings && cargo test --manifest-path src-tauri/Cargo.toml
```
