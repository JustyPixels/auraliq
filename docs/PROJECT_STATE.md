# Auraliq — Project State

> **Read this file first before starting any new work session.**

## Current Status
- **Current Milestone**: Milestone 13 — QA, Optimization & Security (**COMPLETED**)
- **Next Milestone**: Milestone 14 — MVP Release (`1.0.0`)
- **Current Version**: `0.9.0`
- **Repository Status**: `https://github.com/JustyPixels/auraliq` (`main`)

## What Is Completed
- **Milestones 0–12**: Research, Tauri v2 + React 19 foundation, brand assets, 1990s retro purplish deck UI, Theme Editor + Safe Live CSS + JSON import/export, persistent customizable shell, SQLite + FTS5 local music engine, `lofty` metadata/artwork, `symphonia` + `cpal` playback, Windows SMTC, `realfft` visualizers, track identity matching, smart playlists, collections, `ProviderRegistry`, `keyring` credentials, SSRF URL validation, Audius, Internet Archive, Radio Browser, Direct URLs, BYOK Jamendo/Freesound/YouTube, Download Manager, LRU Playback Cache, 5-band biquad EQ + ReplayGain + Gapless + Crossfade, opt-in LRCLIB / local `.lrc` lyrics, static retro website (`website/`), and automated GitHub Pages deployment.
- **Milestone 13**:
  - Resolved all `cargo audit` (`rusqlite 0.43` / `libsqlite3-sys 0.40.0`) and `pnpm audit` (`vitest 4.1.12`) advisories -> **0 vulnerabilities**.
  - Hardened SSRF (`@` userinfo, `.internal`) and Windows reserved device filename sanitization (`CON`, `NUL`, etc.).
  - Optimized idle audio thread wakeups (`recv_timeout`) and batched SQLite folder scans (`with_batch_transaction`).
  - Added Rust integration suite (`src-tauri/tests/integration_pipeline.rs`), verified `--release` build, and published `docs/QA_SECURITY_AUDIT.md`.

## What Is Currently Working
- Full desktop application + static retro project website + zero-vulnerability dependencies + automated CI & GitHub Pages deployment.
- All frontend (`prettier`, `eslint`, `tsc`, `vitest`, `vite build`) and Rust (`rustfmt`, `clippy`, `cargo test`, `cargo build --release`) checks pass.

## What Is Currently Being Developed
- Nothing actively in flight; ready for Milestone 14 (`1.0.0` MVP release).

## Outstanding Issues & Environment Notes
1. **Windows Rust Toolchain**: Local `rustup override set stable-x86_64-pc-windows-msvc` is active; always prepend `$env:USERPROFILE\.cargo\bin` to `PATH` before running `cargo` / `rustc` / `pnpm tauri`.
2. **`frontendDist` Requirement**: Run `pnpm build` before `cargo clippy` / `cargo test`.
3. **Rust 1.100.0 CI**: Avoid index range loops, `.chunks_exact(CONST)`, and `if cond { return false; } true`.

## Known Bugs
- None.

## Key Architectural Decisions
- See [TECHNICAL_DECISIONS.md](architecture/TECHNICAL_DECISIONS.md) (ADR-001 through ADR-012).

## Next Concrete Task
Execute **Milestone 14 — MVP Release (`1.0.0`)**:
1. Add GitHub Release workflow (`.github/workflows/release.yml`) building Windows NSIS installer + Portable ZIP + SHA-256 checksums.
2. Tag `v1.0.0`, publish release notes, and verify final release artifacts.

## Relevant Commands
```powershell
$env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check && cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings && cargo test --manifest-path src-tauri/Cargo.toml
```
