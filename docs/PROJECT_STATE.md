# Auraliq — Project State

> **Read this file first before starting any new work session.**

## Current Status
- **Current Milestone**: Milestone 3 — Core Application Shell (**COMPLETED**)
- **Next Milestone**: Milestone 4 — Local Music Engine (`0.2.0`)
- **Current Version**: `0.1.0`
- **Repository Status**: `https://github.com/JustyPixels/auraliq` (`main`)

## What Is Completed
- **Milestone 0**: Research report, architecture proposal, provider matrix, dependency analysis, compliance rules, ADRs, roadmap.
- **Milestone 1**: Tauri v2 (`2.12.7`) + Rust (`1.96.0`, `x86_64-pc-windows-msvc`) + React 19 + TS + Vite (`pnpm`), CI workflow, governance docs.
- **Milestone 2**: Brand assets (`branding/`), Tauri icons, `--aq-*` retro tokens, 5 built-in themes, UI primitives, `AppShell`.
- **Milestone 3**:
  - `useLayoutStore` (`auraliq.layout.v1`): persistent sidebar width (180–340px), collapse state, section order, pin/hide (Home & Settings locked), right panel state, default landing page, UI density (`comfortable` / `compact`), layout reset
  - `useShortcutsStore` (`auraliq.shortcuts.v1`) + `useKeyboardShortcuts` + `ShortcutsModal` (`?` help dialog, `Ctrl+K`, `Ctrl+B`, `Ctrl+,`, `Alt+1..4`, live rebinding)
  - Resizable `Sidebar` with drag/keyboard handle & Pinned section
  - Dedicated shell pages: `SearchPage`, `LibraryShellPage`, `PlaylistsPage`, `DownloadsPage`, tabbed `SettingsPage` (with `PROVIDER_CATALOG` capability cards)

## What Is Currently Working
- Full Milestone 3 navigable desktop shell, persistent layout & shortcuts, theme & density switching, and Tauri IPC `get_app_info`.
- All frontend (`prettier`, `eslint`, `tsc`, `vitest`, `vite build`) and Rust (`rustfmt`, `clippy`, `cargo test`) checks pass.

## What Is Currently Being Developed
- Nothing actively in flight; ready to begin Milestone 4.

## Outstanding Issues & Environment Notes
1. **Windows Rust Toolchain**: Local `rustup override set stable-x86_64-pc-windows-msvc` is active; always prepend `$env:USERPROFILE\.cargo\bin` to `PATH` before running `cargo` / `rustc` / `pnpm tauri`.
2. **`frontendDist` Requirement**: Run `pnpm build` before `cargo clippy` / `cargo test`.

## Known Bugs
- None.

## Key Architectural Decisions
- See [TECHNICAL_DECISIONS.md](architecture/TECHNICAL_DECISIONS.md) (ADR-001 through ADR-012).

## Next Concrete Task
Execute **Milestone 4 — Local Music Engine (`0.2.0`)**:
1. Add Rust backend dependencies (`symphonia`, `cpal`, `rubato`, `lofty`, `walkdir`, `rusqlite` with `bundled` + `fts5`, `tokio`).
2. Implement SQLite schema, WAL mode, FTS5, and numbered migrations (`src-tauri/src/database/`).
3. Implement background folder scanning & `lofty` metadata/artwork extraction (`src-tauri/src/library/`, `src-tauri/src/metadata/`).
4. Implement `symphonia` + `cpal` + `rubato` audio playback engine (`src-tauri/src/audio/`) and wire Library/Playlists/PlayerBar in the frontend.

## Relevant Commands
```powershell
$env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check && cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings && cargo test --manifest-path src-tauri/Cargo.toml
```
