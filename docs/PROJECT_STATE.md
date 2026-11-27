# Auraliq — Project State

> **Read this file first before starting any new work session.**

## Current Status
- **Current Milestone**: Milestone 1 — Repository & Project Foundation (**COMPLETED**)
- **Next Milestone**: Milestone 2 — Auraliq Design System & Branding
- **Current Version**: `0.1.0`
- **Repository Status**: `main` pushed to `https://github.com/JustyPixels/auraliq`

## What Is Completed
- **Milestone 0**: Full research & feasibility docs (`RESEARCH_REPORT.md`, `ARCHITECTURE_PROPOSAL.md`, `PROVIDER_COMPATIBILITY.md`, `DEPENDENCY_ANALYSIS.md`, `PLATFORM_RESTRICTIONS.md`, `TECHNICAL_DECISIONS.md`, `ROADMAP.md`).
- **Milestone 1**:
  - Tauri v2 (`2.12.7`) + Rust (`1.96.0`, `x86_64-pc-windows-msvc`) + React 19 + TypeScript + Vite (`pnpm`) foundation
  - Typed IPC command `get_app_info` (`src-tauri/src/commands/mod.rs`) and `useAppInfo` hook (`src/hooks/useAppInfo.ts`) with graceful browser preview fallback
  - Governance & docs: `README.md`, `LICENSE` (MIT), `CHANGELOG.md`, `CONTRIBUTING.md`, `SECURITY.md`, `docs/development/BUILDING.md`, issue/PR templates
  - CI workflow: `.github/workflows/ci.yml` (`windows-latest`)

## What Is Currently Working
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (2/2 Vitest tests), `pnpm build`
- `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`, `cargo test` (2/2 Rust unit tests)
- Tauri v2 foundation icons (`src-tauri/icons/`) and least-privilege capability (`src-tauri/capabilities/default.json`)

## What Is Currently Being Developed
- Nothing actively in flight; ready to begin Milestone 2.

## Outstanding Issues & Environment Notes
1. **Windows Rust Toolchain**: Default `rustc` in system PATH resolves to Chocolatey's `x86_64-pc-windows-gnu`. Local `rustup override set stable-x86_64-pc-windows-msvc` is configured for `E:\Auraliq`; always prepend `$env:USERPROFILE\.cargo\bin` to `PATH` before running `cargo` / `rustc` / `pnpm tauri`.
2. **`frontendDist` Requirement**: `pnpm build` must run before `cargo clippy` / `cargo test` so `dist/` exists for `tauri::generate_context!()`.

## Known Bugs
- None.

## Key Architectural Decisions
- See [TECHNICAL_DECISIONS.md](architecture/TECHNICAL_DECISIONS.md) (ADR-001 through ADR-012).

## Next Concrete Task
Execute **Milestone 2 — Auraliq Design System & Branding**:
1. Design final Auraliq app icon, wordmark, compact logo, and GitHub banners (`branding/`).
2. Define retro design tokens (`--aq-*`), typography, and initial themes (Midnight Cassette, CRT Purple, Analog Amber, Retro Terminal, Classic Gray).
3. Build core retro UI primitives and main layout shell (sidebar, content area, optional right panel, bottom player bar).

## Relevant Commands
```powershell
$env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check && cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings && cargo test --manifest-path src-tauri/Cargo.toml
```
