# Auraliq — Project State

> **Read this file first before starting any new work session.**

## Current Status
- **Current Milestone**: Milestone 10 — Customization & 90s Retro Deck UI (**COMPLETED**)
- **Next Milestone**: Milestone 11 — Additional Features (`0.8.0`)
- **Current Version**: `0.7.0`
- **Repository Status**: `https://github.com/JustyPixels/auraliq` (`main`)

## What Is Completed
- **Milestones 0–9**: Research, Tauri v2 + React 19 foundation, brand assets, retro design system, 5 themes, persistent customizable shell, SQLite + FTS5 local music engine, `lofty` metadata/artwork, `symphonia` + `cpal` playback, Windows SMTC (`souvlaki`), `realfft` Canvas visualizer, track identity matching, smart playlists, collections, `ProviderRegistry`, `keyring` credentials, SSRF URL validation, Audius, Internet Archive, Radio Browser, Direct URLs, BYOK Jamendo/Freesound/YouTube, source-aware Download Manager, and LRU Temporary Playback Cache with Offline Mode.
- **Milestone 10 & 90s Retro UI Overhaul**:
  - Zero-radius 1990s purple hardware deck styling (`border-radius: 0px`, 3D raised/sunken bevels, gradient panel titlebars, square LEDs, scanlines).
  - Live `ThemeEditor` (10-color overrides, 4 typography presets, Bevel Style, CRT scanline slider, UI density, visualizer, reduced motion), `CustomCssEditor` (`<style id="auraliq-user-css">` with local-only sanitization), JSON Theme Import/Export (`serialization.ts`), and `Safe Reset All`.

## What Is Currently Working
- Full offline local library + zero-key & BYOK online streaming + permitted downloads + LRU stream cache with Offline Mode + 1990s purple deck UI & live Theme/CSS customization.
- All frontend (`prettier`, `eslint`, `tsc`, `vitest`, `vite build`) and Rust (`rustfmt`, `clippy`, `cargo test`) checks pass.

## What Is Currently Being Developed
- Nothing actively in flight; ready to begin Milestone 11.

## Outstanding Issues & Environment Notes
1. **Windows Rust Toolchain**: Local `rustup override set stable-x86_64-pc-windows-msvc` is active; always prepend `$env:USERPROFILE\.cargo\bin` to `PATH` before running `cargo` / `rustc` / `pnpm tauri`.
2. **`frontendDist` Requirement**: Run `pnpm build` before `cargo clippy` / `cargo test`.
3. **Rust 1.100.0 CI**: Avoid index range loops, `.chunks_exact(CONST)`, and `if cond { return false; } true`.

## Known Bugs
- None.

## Key Architectural Decisions
- See [TECHNICAL_DECISIONS.md](architecture/TECHNICAL_DECISIONS.md) (ADR-001 through ADR-012).

## Next Concrete Task
Execute **Milestone 11 — Additional Features (`0.8.0`)**:
1. Optional opt-in LRCLIB synced/plain lyrics.
2. Equalizer, ReplayGain, crossfade, gapless playback, advanced CRT/cassette visualizers.

## Relevant Commands
```powershell
$env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check && cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings && cargo test --manifest-path src-tauri/Cargo.toml
```
