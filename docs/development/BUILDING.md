# Building Auraliq

## Prerequisites (Windows 10/11 x64)

1. **Microsoft Visual Studio Build Tools** with **Desktop development with C++** (`MSVC v143+` and Windows 10/11 SDK).
2. **Rust (`x86_64-pc-windows-msvc`)** via [`rustup`](https://rustup.rs/).
   - **Important**: Tauri v2 on Windows officially supports **only** the `x86_64-pc-windows-msvc` target. If Chocolatey or MinGW installed an `x86_64-pc-windows-gnu` `rustc` earlier in your `PATH`, ensure `%USERPROFILE%\.cargo\bin` precedes it and run:
     ```powershell
     rustup override set stable-x86_64-pc-windows-msvc
     ```
3. **Node.js** (`>= 22`) and **pnpm** (`>= 10`).
4. **WebView2 Runtime** (pre-installed on Windows 11 and modern Windows 10).

## Setup & Development

```powershell
# Ensure rustup's MSVC toolchain is active
$env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"

# Install frontend dependencies
pnpm install

# Run checks & build frontend (required before cargo check/test due to frontendDist)
pnpm build

# Run Tauri desktop app in dev mode
pnpm tauri dev
```

## Running Verification Checks

```powershell
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build

cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
```
