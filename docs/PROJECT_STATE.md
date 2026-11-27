# Auraliq — Project State

> **Read this file first before starting any new work session.**

## Current Status
- **Current Milestone**: Milestone 0 — Research & Feasibility (**COMPLETED**)
- **Next Milestone**: Milestone 1 — Repository & Project Foundation
- **Current Version**: `0.0.0-research`
- **Repository Status**: Local git initialized on `main` (GitHub remote `JustyPixels/auraliq` to be created in Milestone 1)

## What Is Completed
- Full Milestone 0 research and feasibility analysis:
  - [RESEARCH_REPORT.md](research/RESEARCH_REPORT.md)
  - [ARCHITECTURE_PROPOSAL.md](architecture/ARCHITECTURE_PROPOSAL.md)
  - [PROVIDER_COMPATIBILITY.md](providers/PROVIDER_COMPATIBILITY.md)
  - [DEPENDENCY_ANALYSIS.md](research/DEPENDENCY_ANALYSIS.md)
  - [PLATFORM_RESTRICTIONS.md](research/PLATFORM_RESTRICTIONS.md)
  - [TECHNICAL_DECISIONS.md](architecture/TECHNICAL_DECISIONS.md)
  - [ROADMAP.md](../ROADMAP.md)

## What Is Currently Working
- Documentation & architecture baseline is complete and verified.
- Local toolchain verified: `node v24.18.0`, `pnpm 10.33.0`, `git 2.53.0`, `gh` authenticated as `JustyPixels`, `rustup` with `stable-x86_64-pc-windows-msvc` and VS 18 installed.

## What Is Currently Being Developed
- Nothing actively in flight; ready to begin Milestone 1.

## Outstanding Issues & Environment Notes
1. **Windows Rust Toolchain**: `rustc` in default PATH resolves to Chocolatey's `x86_64-pc-windows-gnu` (`1.94.0`), which is **unsupported by Tauri v2** (fails `WebView2LoaderStatic.lib` linking and NSIS bundling). Milestone 1 must pin `x86_64-pc-windows-msvc` via `rust-toolchain.toml` and invoke `rustup`/MSVC cargo (`%USERPROFILE%\.cargo\bin` ahead of Chocolatey).
2. **GitHub Remote**: `JustyPixels/auraliq` does not exist yet; create it in Milestone 1.

## Known Bugs
- None (no application code written yet).

## Key Architectural Decisions
- **Shell**: Tauri v2 (`2.12.7`) + Rust (`x86_64-pc-windows-msvc`), NSIS + Portable ZIP, `tauri-plugin-updater`.
- **Audio Engine**: `symphonia` (`0.6.1`) + `cpal` (`0.18.2`) + `rubato` (`5.1.0`) + `realfft` (`3.5.0`); WMA unsupported.
- **Metadata & DB**: `lofty` (`0.25.5`), `walkdir` (`2.5.1`), `rusqlite` (`0.43.0` bundled, WAL, FTS5).
- **Windows Integration**: `souvlaki` (`0.9.3`) for SMTC/media keys; `keyring` (`4.2.0`) for Windows Credential Manager.
- **Frontend**: React 19 + TypeScript + Vite + `pnpm` + Zustand + TanStack Virtual + Canvas visualizers.
- **Theming**: `--aq-*` CSS Custom Properties + JSON themes + scoped `<style id="auraliq-user-css">` under strict CSP.
- **MVP Providers**: Local Library (Tier 1) + Internet Archive, Radio Browser, Direct Audio URLs (Tier 2); YouTube/Spotify strictly optional & compliant.
- **License**: MIT.

## Next Concrete Task
Execute **Milestone 1 — Repository & Project Foundation**:
1. Create `JustyPixels/auraliq` on GitHub and push `main`.
2. Add `rust-toolchain.toml` (`stable-x86_64-pc-windows-msvc`), scaffold Tauri v2 + React 19 + TS + Vite (`pnpm`).
3. Configure `clippy`, `rustfmt`, `eslint`, `prettier`, `vitest`, GitHub Actions CI, `README.md`, `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md`.
4. Verify MSVC build (`cargo check` / `cargo test` / `pnpm build`).

## Relevant Commands (for Milestone 1)
```powershell
$env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
pnpm build
pnpm test
```
