# Auraliq — Project State

> **Read this file first before starting any new work session.**

## Current Status
- **Current Milestone**: Milestone 12 — Website & Documentation (**COMPLETED**)
- **Next Milestone**: Milestone 13 — QA, Optimization & Security (`0.9.0`)
- **Current Version**: `0.8.1`
- **Repository Status**: `https://github.com/JustyPixels/auraliq` (`main`)

## What Is Completed
- **Milestones 0–11**: Research, Tauri v2 + React 19 foundation, brand assets, 1990s retro purplish deck UI, Theme Editor + Safe Live CSS + JSON import/export, persistent customizable shell, SQLite + FTS5 local music engine, `lofty` metadata/artwork, `symphonia` + `cpal` playback, Windows SMTC, `realfft` visualizers (Bars, Scope, Cassette, Dual VU, CRT Matrix), track identity matching, smart playlists, collections, `ProviderRegistry`, `keyring` credentials, SSRF URL validation, Audius, Internet Archive, Radio Browser, Direct URLs, BYOK Jamendo/Freesound/YouTube, source-aware Download Manager, LRU Temporary Playback Cache with Offline Mode, 5-band biquad EQ + ReplayGain + Gapless + Crossfade, and opt-in LRCLIB / local `.lrc` lyrics.
- **Milestone 12**:
  - Static 1990s retro project website (`website/`) with interactive theme preview, CRT scanlines toggle, Downloads, Features, Sources, Roadmap, About, and FAQ.
  - Automated GitHub Pages deployment workflow (`.github/workflows/pages.yml`).
  - Captured real app screenshot (`docs/screenshots/auraliq-home.png`) and refreshed `README.md`.

## What Is Currently Working
- Full desktop application + static retro project website + automated CI & GitHub Pages deployment.
- All frontend (`prettier`, `eslint`, `tsc`, `vitest`, `vite build`) and Rust (`rustfmt`, `clippy`, `cargo test`) checks pass.

## What Is Currently Being Developed
- Nothing actively in flight; ready to begin Milestone 13.

## Outstanding Issues & Environment Notes
1. **Windows Rust Toolchain**: Local `rustup override set stable-x86_64-pc-windows-msvc` is active; always prepend `$env:USERPROFILE\.cargo\bin` to `PATH` before running `cargo` / `rustc` / `pnpm tauri`.
2. **`frontendDist` Requirement**: Run `pnpm build` before `cargo clippy` / `cargo test`.
3. **Rust 1.100.0 CI**: Avoid index range loops, `.chunks_exact(CONST)`, and `if cond { return false; } true`.

## Known Bugs
- None.

## Key Architectural Decisions
- See [TECHNICAL_DECISIONS.md](architecture/TECHNICAL_DECISIONS.md) (ADR-001 through ADR-012).

## Next Concrete Task
Execute **Milestone 13 — QA, Optimization & Security (`0.9.0`)**:
1. End-to-end integration tests, memory/CPU profiling, and security/SSRF/CSP audit.
2. Performance tuning and bug fixes ahead of Milestone 14 (`1.0.0` MVP release).

## Relevant Commands
```powershell
$env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check && cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings && cargo test --manifest-path src-tauri/Cargo.toml
```
