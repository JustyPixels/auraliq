# Contributing to Auraliq

Thank you for your interest in contributing to **Auraliq**!

## Development Setup

See [docs/development/BUILDING.md](docs/development/BUILDING.md) for full prerequisites and Windows MSVC toolchain setup.

## Workflow

1. Check [ROADMAP.md](ROADMAP.md) and [docs/PROJECT_STATE.md](docs/PROJECT_STATE.md) before starting work.
2. Branch from `main` using descriptive names (`feat/...`, `fix/...`, `docs/...`).
3. Keep commits focused and use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`, `test:`).
4. Respect all platform Terms of Service and legal boundaries in [docs/research/PLATFORM_RESTRICTIONS.md](docs/research/PLATFORM_RESTRICTIONS.md). Never add fake/mocked controls or unauthorized stream extraction.

## Required Checks Before Opening a PR

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
