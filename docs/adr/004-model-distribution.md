# ADR 004 - Model Distribution

- **Status:** Accepted
- **Date:** 2026-11-21
- **Decision confirmed:** 2026-11-21 - downloadable model packs with checksum verification and explicit consent.

## Context

On-device separation models can be large. Bundling all models in the app increases install size and update cost. Downloading models requires integrity checks and clear user consent.

## Decision

Use **downloadable model packs** for MVP, with checksums and explicit user consent.

- App binary ships with engine code and UI, not large model weights by default.
- On first use of a mode, app prompts user to download required model pack.
- Model packs are stored in app-managed storage and verified by SHA-256 before activation.
- A bundled "tiny demo model" may be considered later only if size/quality justify it.

## Alternatives considered

### Bundle all models in app
- Pros: works fully offline immediately after install.
- Cons: large app size, painful updates, harder to iterate on models.

### Remote inference
- Pros: no device model burden.
- Cons: violates offline-on-device product constraint; not acceptable for core split.

## Consequences

- Need model manifest format (`engine/manifest.schema.json`).
- Need download manager with resume/checksum/space checks.
- Need "models available offline" UI state.
- After download, separation remains offline.
- Legal/licensing notices must ship with or alongside model packs.