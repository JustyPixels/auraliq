# Security Policy

## Supported Versions

| Version | Supported            |
| ------- | -------------------- |
| `1.0.x` | Yes (MVP Release)    |
| `0.9.x` | Security maintenance |

## Security Audit

See [docs/QA_SECURITY_AUDIT.md](docs/QA_SECURITY_AUDIT.md) for the Milestone 13 dependency, SSRF, CSP, and capability audit report.

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Instead, report vulnerabilities privately via GitHub Security Advisories on the `JustyPixels/auraliq` repository or contact the maintainer directly. Include reproduction steps, affected version, and potential impact.

## Security Principles

- **Least-Privilege IPC**: Tauri v2 capabilities (`src-tauri/capabilities/`) strictly scope frontend permissions.
- **Content Security Policy (CSP)**: Restrictive CSP disables arbitrary remote/inline script execution.
- **Secrets**: Provider tokens and API keys are stored only in OS secure credential storage (Windows Credential Manager via `keyring`), never in plaintext SQLite or config files.
- **User CSS**: Custom user CSS is injected into a scoped `<style>` element without script execution privileges.
- **Privacy**: Zero telemetry by default; local library metadata and audio files are never uploaded.
