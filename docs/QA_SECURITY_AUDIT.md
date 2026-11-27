# Auraliq — QA, Performance & Security Audit (`0.9.0`)

**Audit Date**: 2026-11-27  
**Target Version**: `0.9.0` (Milestone 13)  
**Target Platform**: Windows 10/11 x64 (`x86_64-pc-windows-msvc`)

---

## 1. Dependency Security Audit

### Rust Backend (`cargo audit --file src-tauri/Cargo.lock`)
- **Initial scan finding**: `RUSTSEC-2026-0459` (`libsqlite3-sys < 0.39.0`, C SQLite CVE-2026-119375, severity 6.8 medium).
- **Remediation**: Upgraded `rusqlite` (`0.35` -> `0.43`, bundling `libsqlite3-sys 0.40.0`).
- **Post-fix result**: **0 vulnerabilities found** across 566 crate dependencies (4 upstream GTK/chrono/macro warnings unrelated to Windows runtime).

### Frontend & Tooling (`pnpm audit`)
- **Initial scan finding**: 5 dev-dependency advisories in `vitest 3.x` (`tinypool` / `@vitest/mocker`).
- **Remediation**: Upgraded `vitest` (`3.2.7` -> `4.1.12`).
- **Post-fix result**: **0 known vulnerabilities found** (both production and full dev+prod trees).

---

## 2. Application Security Controls

| Control | Implementation | Verification |
| --- | --- | --- |
| **Tauri Capabilities** | `src-tauri/capabilities/default.json` | Scoped strictly to `core:default` and `dialog:default` for `main` window only. |
| **Content Security Policy (CSP)** | `src-tauri/tauri.conf.json` | Restricts `script-src 'self'`, `connect-src 'self' ipc: http://ipc.localhost`, and `assetProtocol` scope to `$APPLOCALDATA/artwork/**`. |
| **Secret Storage** | `src-tauri/src/security/credentials.rs` | Provider API keys/client IDs stored in Windows Credential Manager (`keyring`), never in SQLite or JSON config files. |
| **SSRF & URL Validation** | `src-tauri/src/security/validation.rs` | Blocks non-HTTP(S) schemes, embedded `@` userinfo credentials, `localhost`/`.local`/`.internal`, loopback, private, link-local, CGNAT `100.64.0.0/10`, and IPv4-mapped IPv6 addresses; re-validates post-redirect URLs in downloads & cache. |
| **Filename & Path Safety** | `src-tauri/src/security/validation.rs` | Rejects `..` traversal and separators, strips trailing dots/spaces, sanitizes reserved Windows characters, and prefixes Windows reserved device names (`CON`, `PRN`, `AUX`, `NUL`, `COM1–9`, `LPT1–9`). |
| **Safe Live CSS** | `src/themes/userCss.ts` | Strips `<style>` tags, `@import`, external `url()`, `expression()`, `behavior:`, `-moz-binding:`, and `javascript:` URIs before injecting into `<style id="auraliq-user-css">`. |
| **ToS & Privacy Compliance** | `ProviderRegistry`, `DownloadManager`, `Lyrics` | Enforces `download` and `offline_cache_allowed` flags; LRCLIB online lyrics strictly opt-in (`lrclib_enabled = 0` by default); zero telemetry. |

---

## 3. Performance Optimizations & Benchmarks

1. **Idle Audio Thread Wakeup Reduction (`src-tauri/src/audio/mod.rs`)**:
   - Replaced continuous `12ms` busy-polling (~83 wakeups/sec) while idle/paused with blocking `rx.recv_timeout(150ms)` (~6.7 wakeups/sec, 0ms command wake latency), keeping `12ms` cadence only during active playback.
2. **Batched SQLite Folder Scanning (`src-tauri/src/database/mod.rs`, `src-tauri/src/library/mod.rs`)**:
   - Wrapped per-folder track upserts, missing-file reconciliation, and folder timestamp updates in `Database::with_batch_transaction` (`BEGIN IMMEDIATE ... COMMIT`), eliminating per-file WAL fsync overhead.
   - Verified in `src-tauri/tests/integration_pipeline.rs::batch_scan_performance_100_files` (100 WAV files indexed well under 5s, incremental no-op rescan well under 2s).

---

## 4. Test & Release Verification Scope

- **Frontend**: `prettier --check`, `eslint`, `tsc --noEmit`, `vitest run` (16 test files, 35 tests), and `vite build`.
- **Rust**: `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`, `cargo test` (35 unit tests + 5 end-to-end integration tests in `tests/integration_pipeline.rs`), and `cargo build --release`.
- **Note**: Clean-environment Windows VM installer/upgrade/uninstall verification will be executed as part of Milestone 14 (`1.0.0`) when NSIS & Portable ZIP artifacts are produced.
