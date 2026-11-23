# MOTF Mobile

Mobile version of MOTF, built as a **separate app with a separate on-device separation engine**.

## Goal

Bring MOTF's stem-separation experience to iOS and Android while preserving the core product principle:

> **Splitting happens offline, on-device. No audio upload required.**

This directory is intentionally separate from `stem-splitter/` (desktop, NativePHP/Electron + Python/Demucs). Mobile cannot reuse the desktop Python/PyTorch runtime directly, so the mobile app is designed around a **native/mobile ML engine** and a shared job/stem contract.

## Status

**Planning / scaffold - MVP decisions confirmed.** This is not a production-ready mobile app yet.

What exists here:
- Architecture and engine documentation (`docs/`)
- An engine contract describing inputs, outputs, progress, and stem artifacts (`engine/`)
- An app scaffold placeholder (`app/`)

What does not exist yet:
- A complete iOS/Android app shell
- A selected and validated production model for the MVP mode
- A fully optimized on-device inference pipeline
- App Store / Play Store releases

## Current MVP

Confirmed decisions for the first mobile milestone:

- **App shell:** Expo (React Native) + native modules/custom dev client (see [ADR 001](docs/adr/001-app-shell.md)).
- **MVP mode:** `vocal_instrumental` (2 stems: vocals, instrumental) only for the Phase 1 engine spike.
- **Post-spike:** `vocal_split` (lead, backing, instrumental) is the next candidate after the 2-stem pipeline is proven; no lead/backing separation in Phase 1.
- **Model distribution:** downloadable model packs with SHA-256 verification and explicit user consent (see [ADR 004](docs/adr/004-model-distribution.md)).
- **Model selection:** no production model selected yet. Track candidates in [`docs/MODEL_CANDIDATES.md`](docs/MODEL_CANDIDATES.md) and record the final selection in [`docs/MODEL_SELECTION.md`](docs/MODEL_SELECTION.md).

## Directory layout

```text
mobile/
  README.md                 This file
  docs/
    ARCHITECTURE.md         System design, boundaries, data flow
    ENGINE.md               Separation engine contract and runtime design
    MODELS.md               Model selection, conversion, packaging, licensing
    MODEL_CANDIDATES.md     Candidate model research notes for spike
    MODEL_EVALUATION.md     Practical model evaluation checklist/template
    MODEL_SELECTION.md      Concrete selection record for the first MVP model
    DEVELOPMENT.md          Proposed dev workflow, milestones, testing
    adr/                    Architecture Decision Records
  engine/
    contract.ts             TypeScript contract for jobs/stems/progress
    manifest.schema.json    JSON schema for engine/model capability manifests
    models/                 Example manifests and model-pack notes
    spike/                  Phase 1 engine spike plan
    native/                 iOS/Android/shared native engine stubs + bridge/pipeline docs
  scripts/
    validate-manifest.mjs   Lightweight manifest validator (no deps)
    checksum-file.mjs       SHA-256/size helper for model files
    create-manifest.mjs     Manifest template generator with real checksum/size
  app/
    App.tsx                 Tabbed app scaffold (Jobs/Progress/Player/Settings)
    src/engine/             Engine bridge + dev-only mock engine
    src/screens/            Screen scaffolds
    README.md               App-shell integration notes
```

## Design principles

1. **Offline first.** Audio files and generated stems stay on-device by default.
2. **Separate engine.** Mobile inference is implemented with mobile-native runtimes, not desktop Python processes.
3. **Shared contract, different implementation.** Desktop and mobile can share concepts (job, mode, stem, progress) without sharing the same execution engine.
4. **Honest capabilities.** Mobile model choices may trade quality/speed/size differently than desktop Demucs. The UI must reflect actual supported modes.
5. **Progressive delivery.** Ship a narrow, reliable first split mode before chasing desktop parity.

## Relationship to desktop

| Area | Desktop (`stem-splitter/`) | Mobile (`mobile/`) |
|---|---|---|
| Shell | NativePHP Desktop / Electron | Expo (React Native) + native modules |
| Engine | Python CLI tools (Demucs, drumsep, audio-separator) | Mobile ML runtime (Core ML / ONNX Runtime Mobile / LiteRT) |
| Models | PyTorch/checkpoint models downloaded by tools | Converted/bundled mobile models (`.mlpackage`, `.onnx`, `.tflite`) |
| Execution | Background local process | On-device background task/job queue |
| Offline | Yes | Yes (required) |
| Distribution | DMG/EXE | App Store / Play Store |

## Start here

1. Read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
2. Read [`docs/ENGINE.md`](docs/ENGINE.md)
3. Read [`docs/MODELS.md`](docs/MODELS.md)
4. Read [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md)
