# Auraliq — Dependency Analysis

> **Milestone**: 0  
> **Criteria**: Active maintenance, permissive/compatible licensing, low overhead, Windows MSVC compatibility.

---

## 1. Rust Backend Crates (`src-tauri/Cargo.toml`)

| Crate | Verified Version | License | Role | Rejected Alternative & Reason |
|---|---|---|---|---|
| `tauri` | `2.12.7` | Apache-2.0 / MIT | Desktop shell, IPC, capabilities, bundling | Electron (100+ MB bundle, high RAM) |
| `tauri-plugin-updater` | `2.x` | Apache-2.0 / MIT | Signed auto-updates via GitHub Releases | Custom updater binary |
| `symphonia` | `0.6.1` | MPL-2.0 | Pure-Rust audio demuxing & decoding | `rodio` (`0.21.0`) — hides PCM FFT tap & fine seeking |
| `cpal` | `0.18.2` | Apache-2.0 | Cross-platform audio output & device enumeration | OS-specific WASAPI bindings (less portable) |
| `rubato` | `5.1.0` | MIT | Sample-rate conversion | Naive linear resampling (audible aliasing) |
| `realfft` | `3.5.0` | MIT / Apache-2.0 | Real-valued FFT for visualizers | `rustfft` directly (2x work for real audio) |
| `lofty` | `0.25.5` | MIT OR Apache-2.0 | Metadata & album art read/write | `id3` + `metaflac` (fragmented per-format crates) |
| `souvlaki` | `0.9.3` | MIT | Windows SMTC & OS media keys | Raw `windows` WinRT boilerplate |
| `keyring` | `4.2.0` | MIT OR Apache-2.0 | Windows Credential Manager secret storage | Encrypted local file (weaker key protection) |
| `rusqlite` | `0.43.0` | MIT | Embedded SQLite + FTS5 (`bundled` feature) | `sqlx` (`0.9.0`) — heavier compile & async pool overhead |
| `reqwest` | `0.13.5` | MIT OR Apache-2.0 | Async HTTP client for APIs, streams, downloads | `ureq` (sync-only, harder concurrent downloads) |
| `walkdir` | `2.5.1` | Unlicense / MIT | Recursive local folder scanning | Manual `std::fs::read_dir` recursion |
| `tokio` | `1.x` | MIT | Async runtime (shared with Tauri/reqwest) | `async-std` |
| `serde` / `serde_json` | `1.x` | MIT OR Apache-2.0 | IPC, theme JSON, config serialization | — |
| `thiserror` / `anyhow` | `2.x` / `1.x` | MIT OR Apache-2.0 | Typed domain errors & diagnostics | String errors |

---

## 2. Frontend Packages (`package.json`)

| Package | Role | Rejected Alternative & Reason |
|---|---|---|
| `react` / `react-dom` (`19.x`) | UI component runtime | Svelte 5 / SolidJS (smaller ecosystem for virtualized grids & code editors) |
| `typescript` (`5.x`) | Static type safety | Plain JS |
| `vite` (`6.x`+) | Fast dev server & bundler | Webpack (slower builds) |
| `zustand` (`5.x`) | Lightweight state management | Redux Toolkit (excessive boilerplate) |
| `@tanstack/react-virtual` | Virtualized 10k+ track lists | Rendering full DOM lists (freezes UI) |
| `lucide-react` | Crisp retro-friendly UI icons | Heavy icon font packs |
| `vitest` + `@testing-library/react` | Fast unit & component tests | Jest (slower ESM/Vite integration) |

---

## 3. Tooling, CI & Packaging

- **Package Manager**: `pnpm` (`10.33.0`) — fast, deterministic lockfile.
- **Rust Toolchain**: `x86_64-pc-windows-msvc` (required by Tauri v2 / WebView2).
- **Windows Bundler**: Tauri NSIS (`-setup.exe`) + Portable ZIP. WebView2 bootstrapper handled automatically by Tauri NSIS config.
- **Linting & Formatting**: `cargo fmt --check`, `cargo clippy -- -D warnings`, `eslint`, `prettier`, `tsc --noEmit`.
