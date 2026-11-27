# Auraliq — Project State

> **Read this file first before starting any new work session.**

## Current Status
- **Current Milestone**: Milestone 2 — Auraliq Design System & Branding (**COMPLETED**)
- **Next Milestone**: Milestone 3 — Core Application Shell
- **Current Version**: `0.1.0`
- **Repository Status**: `https://github.com/JustyPixels/auraliq` (`main`)

## What Is Completed
- **Milestone 0**: Research report, architecture proposal, provider matrix, dependency analysis, compliance rules, ADRs, roadmap.
- **Milestone 1**: Tauri v2 (`2.12.7`) + Rust (`1.96.0`, `x86_64-pc-windows-msvc`) + React 19 + TS + Vite (`pnpm`), CI workflow, governance docs.
- **Milestone 2**:
  - Brand assets in `branding/` (`auraliq-icon-1024.png`, vector icons, dark/light/compact logos, GitHub banner, social preview) and regenerated Tauri icons (`src-tauri/icons/`)
  - Retro `--aq-*` CSS token system (`src/styles/tokens.css`, `base.css`, `components.css`, `layout.css`)
  - 5 built-in themes (`Midnight Cassette`, `CRT Purple`, `Analog Amber`, `Retro Terminal`, `Classic Gray`) + `useThemeStore` + Reduced Motion support
  - Retro UI primitives (`BrandMark`, `Button`, `Panel`, `Badge`, `Slider`, `EmptyState`, `ThemePicker`)
  - Desktop `AppShell` (`Sidebar`, `RightPanel`, `PlayerBar` with honestly disabled Milestone 4 transport controls, `HomePage`, `SettingsPage`, `SectionPlaceholderPage`)

## What Is Currently Working
- Theme switching & persistence, Reduced Motion toggle, sidebar collapse, right panel tabs, section navigation, Tauri IPC `get_app_info` + browser preview fallback.
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`
- `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`, `cargo test`

## What Is Currently Being Developed
- Nothing actively in flight; ready to begin Milestone 3.

## Outstanding Issues & Environment Notes
1. **Windows Rust Toolchain**: Local `rustup override set stable-x86_64-pc-windows-msvc` is active; always prepend `$env:USERPROFILE\.cargo\bin` to `PATH` before running `cargo` / `rustc` / `pnpm tauri`.
2. **`frontendDist` Requirement**: Run `pnpm build` before `cargo clippy` / `cargo test`.

## Known Bugs
- None.

## Key Architectural Decisions
- See [TECHNICAL_DECISIONS.md](architecture/TECHNICAL_DECISIONS.md) (ADR-001 through ADR-012).

## Next Concrete Task
Execute **Milestone 3 — Core Application Shell**:
1. Persistent layout settings store (sidebar width/collapsed state, section order/visibility, right panel state, default landing page).
2. Sidebar customization UI in Settings (reorder/hide/pin sections, reset layout).
3. Keyboard shortcuts foundation (navigation, theme/panel toggles, Help overlay).
4. Search & Library/Playlist/Downloads shell refinements ready for Milestone 4 data wiring.

## Relevant Commands
```powershell
$env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check && cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings && cargo test --manifest-path src-tauri/Cargo.toml
```
