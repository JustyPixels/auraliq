# Auraliq — Project State

> **Read this file first before starting any new work session.**

## Current Status
- **Current Milestone**: Milestone 11 — Additional Features (**COMPLETED**)
- **Next Milestone**: Milestone 12 — Website & Documentation (`0.8.x`)
- **Current Version**: `0.8.0`
- **Repository Status**: `https://github.com/JustyPixels/auraliq` (`main`)

## What Is Completed
- **Milestones 0–10**: Research, Tauri v2 + React 19 foundation, brand assets, 1990s retro purplish deck UI, 5 themes + Theme Editor + Safe Live CSS + JSON import/export, persistent customizable shell, SQLite + FTS5 local music engine, `lofty` metadata/artwork, `symphonia` + `cpal` playback, Windows SMTC, `realfft` visualizer, track identity matching, smart playlists, collections, `ProviderRegistry`, `keyring` credentials, SSRF URL validation, Audius, Internet Archive, Radio Browser, Direct URLs, BYOK Jamendo/Freesound/YouTube, source-aware Download Manager, and LRU Temporary Playback Cache with Offline Mode.
- **Milestone 11**:
  - 5-band biquad Equalizer + preamp + presets, ReplayGain normalization, Gapless Playback preloading, and Crossfade (`0–8s`) in `src-tauri/src/audio/dsp.rs` & `audio/mod.rs`.
  - Offline `.lrc` sidecars + optional opt-in LRCLIB synced/plain lyrics with SQLite v5 caching (`src-tauri/src/lyrics/`) and `LyricsPanel` in `RightPanel`.
  - Upgraded 5 retro visualizers (`Bars`, `Scope`, `Cassette`, `Dual VU`, `CRT Matrix`) in `AudioVisualizer.tsx` and `EqualizerPanel.tsx` in Settings.

## What Is Currently Working
- Full offline local library + zero-key & BYOK online streaming + permitted downloads + LRU stream cache + 1990s purple deck UI + Theme/CSS customization + 5-band EQ/ReplayGain/Gapless/Crossfade + opt-in LRCLIB lyrics.
- All frontend (`prettier`, `eslint`, `tsc`, `vitest`, `vite build`) and Rust (`rustfmt`, `clippy`, `cargo test`) checks pass.

## What Is Currently Being Developed
- Nothing actively in flight; ready to begin Milestone 12.

## Outstanding Issues & Environment Notes
1. **Windows Rust Toolchain**: Local `rustup override set stable-x86_64-pc-windows-msvc` is active; always prepend `$env:USERPROFILE\.cargo\bin` to `PATH` before running `cargo` / `rustc` / `pnpm tauri`.
2. **`frontendDist` Requirement**: Run `pnpm build` before `cargo clippy` / `cargo test`.
3. **Rust 1.100.0 CI**: Avoid index range loops, `.chunks_exact(CONST)`, and `if cond { return false; } true`.

## Known Bugs
- None.

## Key Architectural Decisions
- See [TECHNICAL_DECISIONS.md](architecture/TECHNICAL_DECISIONS.md) (ADR-001 through ADR-012).

## Next Concrete Task
Execute **Milestone 12 — Website & Documentation (`0.8.x`)**:
1. Build static retro project website (`website/`) with Downloads, Features, Roadmap, About, FAQ.
2. Configure automatic GitHub Pages deployment workflow.
3. Update `README.md` with application details/screenshots.

## Relevant Commands
```powershell
$env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check && cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings && cargo test --manifest-path src-tauri/Cargo.toml
```
