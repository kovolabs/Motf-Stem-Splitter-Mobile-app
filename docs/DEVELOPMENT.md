# Mobile Development Plan

## Purpose

This document proposes how to build MOTF Mobile in phases, with a separate on-device engine.

## Current state

This folder is a scaffold. There is no shipped mobile app yet. The goal is to make the next implementation steps concrete.

## Recommended delivery strategy

### Phase 0 - Decisions (complete)

Decisions are confirmed and recorded in ADRs:

- **App shell:** Expo (React Native) + native modules/custom dev client - [ADR 001](adr/001-app-shell.md).
- **ML runtime:** ONNX Runtime Mobile as the initial cross-platform target; platform-native acceleration (Core ML/NNAPI EPs) evaluated during spike - [ADR 002](adr/002-ml-runtime.md) (Proposed).
- **MVP mode:** `vocal_instrumental` (2 stems: vocals, instrumental) only for Phase 1 spike. `vocal_split` (lead, backing, instrumental) is post-spike after the 2-stem pipeline is proven - [ADR 003](adr/003-mvp-mode.md).
- **Model distribution:** downloadable model packs with SHA-256 verification and explicit user consent - [ADR 004](adr/004-model-distribution.md).
- **Minimum supported devices/OS versions:** TBD - define during spike based on runtime/model memory requirements.

Output:
- ADRs for app shell, MVP mode, and model distribution (completed)
- target device matrix (pending)
- selected MVP model candidate (pending - see [MODEL_SELECTION.md](MODEL_SELECTION.md))

### Phase 1 - Engine spike (2-4 weeks)

Build a proof of concept outside the full UI for the confirmed MVP mode: **`vocal_instrumental` (2 stems)**.

Deliverables:
- load one `vocal_instrumental` ONNX model candidate on iOS and Android;
- run inference on a short WAV file;
- write `vocals` and `instrumental` stem outputs to local storage;
- measure memory, runtime, and thermal behavior;
- evaluate candidate with `docs/MODEL_EVALUATION.md`, record selection in `docs/MODEL_SELECTION.md`, and create a manifest/checksums.

Success criteria:
- same input produces valid 2-stem output on both platforms;
- no crashes on 3-5 minute songs on target devices;
- output quality is good enough for internal listening tests;
- no lead/backing separation is required in this phase.

### Phase 2 - App shell MVP (2-4 weeks)

Deliverables:
- import audio file;
- select one mode;
- run job with progress;
- play/export stems;
- persist job history locally.

Success criteria:
- user can split a song offline end-to-end;
- cancellation and failure states are handled;
- no network required after model is available.

### Phase 3 - Product hardening (ongoing)

- background/resume behavior;
- model integrity checks;
- device capability gating;
- storage cleanup;
- localization/accessibility;
- TestFlight/Internal testing/Play Console tracks.

## Proposed repo layout (when implementation starts)

```text
mobile/
  docs/
  engine/
    contract.ts
    manifest.schema.json
    native/                 # shared C++/Rust or platform bindings
    ios/                    # Swift/Core ML/ORT implementation
    android/                # Kotlin/ORT/LiteRT implementation
  app/
    package.json / pubspec / xcodeproj etc.
    src/
      features/
      components/
      storage/
      engine-bridge/
  scripts/
    convert-model.py
    validate-model.py
    checksum-file.mjs
    create-manifest.mjs
    validate-manifest.mjs
    bench-device.md
```

## Engine interface first

Before building UI, implement the engine contract in `engine/contract.ts` as native bindings.

The UI should only call:
- `getCapabilities()`
- `startJob()`
- `subscribe(jobId)`
- `cancelJob()`
- `listJobs()`

This prevents ML/runtime details from leaking into UI code.

## Testing strategy

### Unit tests
- job state transitions;
- manifest parsing/validation;
- file path/storage management;
- error mapping.

### Integration tests
- import -> job -> stems -> export flow;
- cancellation mid-job;
- app restart during/after job;
- missing/corrupt model handling.

### Golden audio tests
- keep a small set of licensed/test-owned audio fixtures;
- compare output stem durations, sample rates, channel counts;
- optionally compute SDR/quality metrics offline during development.

### Device tests

Test on low/mid/high tier devices. Minimum matrix:
- one older supported iPhone;
- one recent iPhone;
- one mid-range Android;
- one lower-memory Android.

Measure:
- peak memory,
- time to first stem,
- total processing time,
- thermal throttling behavior,
- battery impact.

## Observability

For development builds:
- stage timings;
- chunk count and chunk duration;
- model load time;
- memory warnings;
- output file sizes.

For production:
- keep diagnostics local by default;
- if remote crash reporting is added, redact paths/audio metadata as needed and never upload audio.

## Release checklist

- [ ] Mode capabilities match actual on-device engine.
- [ ] Model licenses/attribution documented.
- [ ] Offline behavior verified in airplane mode.
- [ ] Input/output storage cleanup verified.
- [ ] Cancellation/background interruption verified.
- [ ] Export/share flow verified on iOS and Android.
- [ ] App Store / Play Store privacy disclosures match actual behavior.

## Immediate next tasks

1. Select and verify a first `vocal_instrumental` model candidate (license, ONNX ops, size/memory) - record in [MODEL_SELECTION.md](MODEL_SELECTION.md).
2. Define the target device/OS matrix and benchmark protocol for the Phase 1 spike.
3. Build a tiny native engine spike that runs one `vocal_instrumental` model on one test file on iOS and Android.
4. Only after spike passes: scaffold the mobile app UI around the engine contract and enable the mode through `getCapabilities()`.

## Dev machine next steps (Xcode + Android Studio)

These steps move the mobile MVP from scaffold to a real on-device `vocal_instrumental` spike. Do not commit model weights; do not enable native mode until the pipeline passes device checks.

### 1. Approve the model candidate
- Candidate: `UVR-MDX-NET-Inst_HQ_3.onnx` (see [MODEL_SELECTION.md](MODEL_SELECTION.md)).
- Confirm license/provenance/redistribution rights for the exact file you will ship.
- Record evidence (source URL, revision/date, license text, attribution, redistribution decision) in `MODEL_SELECTION.md`.
- Keep `redistributable: false` until approved.

### 2. Download, hash, and create a real manifest (outside git)
```bash
# Download the approved model file outside the repo (example path)
# /path/to/models/UVR-MDX-NET-Inst_HQ_3.onnx

node mobile/scripts/checksum-file.mjs /path/to/UVR-MDX-NET-Inst_HQ_3.onnx

node mobile/scripts/create-manifest.mjs \
  --model-id uvr-mdx-net-inst-hq-3 \
  --mode vocal_instrumental \
  --runtime onnxruntime \
  --file /path/to/UVR-MDX-NET-Inst_HQ_3.onnx \
  --stems vocals,instrumental \
  --version 1.0.0 \
  --sample-rate 44100 --channels 2 --format float32 \
  --license-name "MIT (verified)" \
  --license-url "https://huggingface.co/notabilia/uvr5-models/blob/main/UVR-MDX-NET-Inst_HQ_3.LICENSE" \
  > mobile/engine/models/uvr-mdx-net-inst-hq-3.manifest.json

node mobile/scripts/validate-manifest.mjs mobile/engine/models/uvr-mdx-net-inst-hq-3.manifest.json
```
- Replace the pending manifest only after the real checksum validates.
- Confirm model tensor contract during spike: sample rate, channels, format, stem order, chunk size/overlap.

### 3. Implement the native ONNX/audio pipeline
- Follow `mobile/engine/native/BRIDGE.md` and `mobile/engine/native/shared/pipeline.md`.
- Implement iOS: `mobile/engine/native/ios/MotfEngine.swift` (and Expo module bridge in `mobile/app/modules/motf-engine/ios/`).
- Implement Android: `mobile/engine/native/android/MotfEngine.kt` (and Expo module bridge in `mobile/app/modules/motf-engine/android/`).
- Pipeline: import/probe -> decode/resample/normalize -> chunk -> ONNX Runtime inference -> overlap-add/postprocess -> encode WAV -> finalize.
- Keep processing local/offline; verify checksums before loading model; support cooperative cancellation.
- JS bridge wiring: `mobile/app/src/engine/engineBridge.ts`; enable native only with `EXPO_PUBLIC_MOTF_ENGINE=native` in a custom dev client.

### 4. Build and validate on real devices
- Create an Expo custom dev client (native modules required; Expo Go is not enough for custom ONNX/native code).
- Test on at least one mid-range iOS device and one mid-range Android device.
- Run 30s, 3min, 5min local audio fixtures in airplane mode.
- Capture: peak memory, time to first output, total time, thermal behavior, output correctness, and listening quality.
- Record results in [MODEL_EVALUATION.md](MODEL_EVALUATION.md) / [MODEL_SELECTION.md](MODEL_SELECTION.md).

### 5. Exit criteria before expanding scope
- `vocal_instrumental` passes on iOS + Android with acceptable quality/perf.
- Manifest/checksum/license/attribution are verified and documented.
- No model weights committed to git unless explicitly approved.
- Only after passing: consider `vocal_split`, additional models, or broader device support.

## Model tooling

Use the lightweight scripts in `mobile/scripts/` when evaluating models:

- `node mobile/scripts/checksum-file.mjs <file> [--json]` - print SHA-256 and size for a model file.
- `node mobile/scripts/create-manifest.mjs --model-id <id> --mode <mode> --runtime <runtime> --file <path> --stems <a,b,...>` - generate a manifest template with real checksum/size.
- `node mobile/scripts/validate-manifest.mjs <manifest.json>` - validate a manifest before committing or using it.

Document candidate evaluations with [`MODEL_EVALUATION.md`](./MODEL_EVALUATION.md). Store manifests in `mobile/engine/models/` and follow [`../engine/models/README.md`](../engine/models/README.md); do not commit model weights by default.