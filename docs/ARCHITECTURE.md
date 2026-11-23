# Mobile Architecture

## Purpose

This document describes the architecture for MOTF Mobile: a fully offline, on-device stem separation app for iOS and Android.

It is intentionally explicit about what is **shared conceptually** with desktop and what must be **implemented differently** for mobile.

## Product constraint

**Audio separation must run offline on-device.**

Implications:
- No audio upload to a server for splitting.
- No dependency on Vercel/serverless/remote GPU for core separation.
- Model files must be bundled with the app or downloaded once and stored locally (with clear user consent and integrity checks).
- The app must remain usable for separation without network connectivity after required assets are present.

## High-level architecture

```text
+-------------------------------------------------------------+
|                        Mobile App UI                        |
|  Import | Mode Select | Job Queue | Progress | Stem Mixer    |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                     Application Layer                       |
|  Job Coordinator | File Manager | Permissions | Settings     |
|  Presets | Export | Notifications | Error Reporting (local) |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                    Separation Engine API                    |
|  prepare() | getCapabilities() | startJob() | cancelJob()   |
|  getJob()  | streamProgress()  | cleanup()                  |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                 Platform Engine Implementation              |
|  iOS: Core ML / ONNX Runtime / Metal / Accelerate          |
|  Android: NNAPI / ONNX Runtime / LiteRT / Vulkan            |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                      Local Asset Store                      |
|  Audio input | Intermediate WAV/PCM | Output stems | Models |
+-------------------------------------------------------------+
```

## Why a separate engine

Desktop (`stem-splitter/`) runs separation by spawning Python processes:
- Demucs CLI for full stems / two-stem isolation
- drumsep Python module for drum sub-splits
- audio-separator CLI for lead/backing vocal split
- FFmpeg for format conversion

This works on desktop because the app can install/manage a Python venv and invoke local binaries. Mobile OS sandboxes, app size limits, background execution rules, CPU/GPU/NPU APIs, and battery/thermal constraints make that approach unsuitable.

Mobile therefore needs a **native inference engine** that:
- loads converted mobile models,
- runs inference through mobile ML runtimes,
- manages memory/battery/thermal budgets,
- exposes the same job/stem concepts to the UI.

## Component responsibilities

### 1. UI layer

Responsible for:
- importing audio from Files/Media Library,
- selecting separation mode,
- showing job queue and progress,
- mixing/previewing stems,
- exporting stems to Files/Share sheet.

Not responsible for:
- model inference,
- model conversion,
- low-level audio tensor preprocessing.

### 2. Application layer

Responsible for:
- creating jobs and persisting job metadata,
- validating input files and permissions,
- managing local storage paths,
- coordinating background execution,
- mapping engine events to UI state,
- handling cancellation, retries, and cleanup.

Suggested local persistence:
- SQLite for job/stem metadata (same conceptual model as desktop),
- filesystem for audio artifacts,
- small key-value store for settings.

### 3. Separation Engine API

A stable interface between app and ML implementation. The UI should not know whether inference is Core ML, ONNX Runtime, or LiteRT.

See [`../engine/contract.ts`](../engine/contract.ts) and [`ENGINE.md`](ENGINE.md).

### 4. Platform engine implementation

Platform-specific or cross-platform native code that implements the engine contract.

Possible implementation strategies:

1. **Shared native core + platform bindings** (preferred long-term)
   - Core in C++/Rust/Swift/Kotlin shared logic where practical.
   - Use ONNX Runtime Mobile or platform ML APIs.
   - Expose a thin bridge to the app shell.

2. **Per-platform engine implementations** (acceptable MVP)
   - iOS implementation using Core ML + Accelerate/vDSP.
   - Android implementation using ONNX Runtime Mobile/LiteRT + NNAPI.
   - Same contract, different internals.

3. **Cross-platform app shell + native engine modules** (pragmatic)
   - App shell in React Native/Flutter/Capacitor.
   - Heavy inference in native modules/plugins.
   - Avoid running inference in JS/Dart UI thread.

## Data flow

### Import and job creation

```text
User selects audio file
  -> App copies/imports into app-managed sandbox location
  -> App probes metadata (duration, channels, sample rate, format)
  -> App creates Job record (pending)
  -> App enqueues job in engine
```

### Separation job

```text
Job pending
  -> Engine prepares model/session (if needed)
  -> Engine decodes/resamples audio to model input format
  -> Engine runs inference (chunked/windowed)
  -> Engine writes stem outputs (WAV/FLAC/M4A)
  -> Engine emits progress/events
  -> App updates Job/Stem records
  -> Job completed/failed/cancelled
```

### Playback/export

```text
Completed job
  -> UI loads stem files from local storage
  -> Mixer plays stems via platform audio APIs
  -> User exports selected stems through share/export sheet
```

## Job/stem contract (shared concept)

The mobile app should preserve desktop concepts where useful:

- **Job**: id, title, source path/URI, mode, status, progress, error, timestamps, output directory.
- **Stem**: id, job id, name, label, file path/URI, color, volume, muted.
- **Mode**: stable identifier, label, description, expected stems, engine capabilities required.

This allows future code/doc reuse and makes desktop/mobile behavior easier to reason about.

## Storage layout (proposed)

```text
<App Sandbox>/
  audio/
    imports/
      <job-id>/source.ext
    outputs/
      <job-id>/
        lead_vocals.wav
        backing_vocals.wav
        instrumental.wav
  models/
    manifests/
      vocal_split_v1.json
    onnx/
      vocal_split_v1.onnx
    coreml/
      VocalSplitV1.mlpackage/
  db/
    motf.sqlite
  logs/
    engine.log
```

Rules:
- Store only files the app owns or has explicit permission to access.
- Keep model files versioned and checksummed.
- Clean up intermediate files aggressively after job completion/failure.
- Make export an explicit user action to a user-selected destination/share target.

## Background execution

Audio separation can take minutes. Mobile OSes limit background work.

### iOS
- Use background-capable task patterns carefully; long CPU-heavy work is constrained.
- Prefer foreground execution with clear progress; allow resumable/chunked jobs where possible.
- Persist job state so the app can recover after interruption.

### Android
- Use foreground service / work manager patterns appropriate for long-running user-initiated processing.
- Be explicit in notifications when processing continues.
- Handle process death and resume from persisted job state.

## Performance constraints

- **Model size**: large models increase app download size and memory pressure.
- **RAM**: mobile devices have tighter memory budgets than desktop; chunked inference is required.
- **Thermals**: sustained inference can throttle; engine should expose performance/quality modes.
- **Battery**: provide "fast" vs "efficient" settings later; default to stable behavior.
- **Audio length**: long files should be chunked with overlap-add/reconstruction strategy.

## Security and privacy

- Default offline processing; no analytics that include audio.
- No third-party upload of user audio.
- If crash reporting is added later, exclude file contents and sensitive paths.
- Validate model checksums before loading.
- Keep model download/update optional and explicit.

## Observability

Local-only diagnostics for MVP:
- job lifecycle events,
- engine timings per stage (decode/preprocess/infer/postprocess/encode),
- memory warnings,
- model load failures,
- output validation errors.

Do not log raw audio content.

## Decisions

Confirmed decisions (see ADRs):

1. **App shell:** Expo (React Native) + native modules/custom dev client. See [ADR 001](adr/001-app-shell.md).
2. **Primary ML runtime:** ONNX Runtime Mobile as the initial cross-platform target; platform-native acceleration evaluated during spike. See [ADR 002](adr/002-ml-runtime.md) (Proposed).
3. **First shipped mode / MVP scope:** `vocal_instrumental` (2 stems: vocals, instrumental) only for the Phase 1 spike. `vocal_split` (lead, backing, instrumental) is post-spike; no lead/backing separation in Phase 1. See [ADR 003](adr/003-mvp-mode.md).
4. **Model distribution:** downloadable model packs with SHA-256 verification and explicit user consent. See [ADR 004](adr/004-model-distribution.md).

Remaining open decisions:

5. **Playback engine:** platform-native audio graph vs cross-platform audio library - evaluate during app-shell implementation.
6. **Minimum supported devices/OS versions:** define during Phase 1 spike based on runtime/model memory requirements.