# JS <-> Native Bridge Contract

This document defines the bridge between the mobile JS/TS app shell and the platform-native MOTF separation engine.

**Status:** draft scaffold. Keep aligned with:

- [`../../contract.ts`](../../contract.ts) - canonical TS contract
- [`../../../docs/ENGINE.md`](../../../docs/ENGINE.md) - engine behavior/lifecycle
- [`ios/MotfEngine.swift`](ios/MotfEngine.swift) - iOS stub
- [`android/MotfEngine.kt`](android/MotfEngine.kt) - Android stub

## Design rules

- **JS owns UI/state orchestration; native owns inference.** JS must not run model inference.
- **Local-only.** Input/output URIs are local files/paths. Reject remote `http(s)` URLs.
- **Stable names.** Method names, event names, status/stage enums, and stem names must stay stable across iOS and Android.
- **Serializable payloads.** Bridge payloads must be JSON-serializable primitives/objects/arrays. No functions, class instances, or binary blobs over the bridge.
- **Additive evolution.** Add optional fields before renaming/removing fields. Version the bridge if a breaking change is unavoidable.

## Bridge options

Two implementation paths are acceptable. Pick one per app runtime; do not expose both to feature code.

| Option | When to use | Method call shape | Event shape |
|---|---|---|---|
| Expo Modules | Expo-managed / Expo Modules app | Async function exported by module | `EventEmitter` / module event subscription |
| React Native Native Module | Bare RN / legacy bridge | `NativeModules.MotfEngine.method(...)` | `NativeEventEmitter` / `DeviceEventEmitter` |

**Recommended module name:** `MotfEngine`

**Recommended event name:** `MotfJobEvent`

## Method mapping

The table maps `SeparationEngine` methods in `contract.ts` to bridge methods. Native implementations may expose the same names; the JS wrapper should normalize any platform naming quirks.

| contract.ts (`SeparationEngine`) | Bridge method | Request payload | Response payload | Notes |
|---|---|---|---|---|
| `getCapabilities()` | `getCapabilities` | none | `EngineCapabilities` | Report real device/runtime/model availability. Never hardcode desktop parity. |
| `prepare(mode, options?)` | `prepare` | `{ mode: string, options?: SeparationOptions }` | `PrepareResult` | Optional preflight: resolve manifest, verify checksum, warm model/session. |
| `startJob(request)` | `startJob` | `SeparationRequest` | `Job` | Returns accepted/pending job immediately; work continues asynchronously. |
| `getJob(jobId)` | `getJob` | `{ jobId: string }` | `Job \| null` | Polling fallback; prefer events. |
| `listJobs()` | `listJobs` | none / `{ filter? }` | `Job[]` | Filter is optional future extension; MVP can return all jobs. |
| `cancelJob(jobId)` | `cancelJob` | `{ jobId: string }` | `CancelResult` | Cooperative cancellation; status becomes `cancelled`, not `failed`. |
| `deleteJob(jobId, options?)` | `deleteJob` | `{ jobId: string, options?: { deleteOutputFiles?: boolean } }` | `void` / `{ ok: true }` | Bridge may return an ack object; JS wrapper normalizes to `void`. |
| `subscribe(jobId, onEvent)` | `addListener` / `removeListeners` + event emitter | listener registration | unsubscribe function | JS wrapper implements `subscribe` by filtering `MotfJobEvent`s by `job.id`. |

## Payloads

Payloads mirror `contract.ts`. JSON examples below are illustrative.

### `SeparationRequest`

```json
{
  "jobId": "optional-client-id",
  "inputUri": "file:///.../input.m4a",
  "mode": "vocal_instrumental",
  "outputDir": "file:///.../jobs/job-123",
  "displayName": "My Song",
  "options": {
    "outputFormat": "wav",
    "sampleRate": 44100,
    "quality": "balanced",
    "chunkSeconds": 30,
    "overlapSeconds": 2,
    "modelId": "vocal-instrumental-example-v1"
  }
}
```

Validation (native side, before heavy work):

- `inputUri` must be local and readable; reject `http://` and `https://`.
- `mode` must be known/available in capabilities or return a machine-readable error.
- `outputDir` must be app-managed and writable.
- `options.sampleRate`, format, chunk/overlap values must be validated against model/device limits.

### `Job`

```json
{
  "id": "job-123",
  "inputUri": "file:///.../input.m4a",
  "displayName": "My Song",
  "mode": "vocal_instrumental",
  "status": "running",
  "progress": 0.42,
  "stage": "inference",
  "stageProgress": 0.61,
  "message": "Processing chunk 8/13",
  "createdAt": "2026-11-21T21:00:00Z",
  "updatedAt": "2026-11-21T21:00:12Z",
  "startedAt": "2026-11-21T21:00:01Z",
  "completedAt": null,
  "outputDir": "file:///.../jobs/job-123",
  "stems": [],
  "warnings": []
}
```

### `StemArtifact`

```json
{
  "name": "vocals",
  "label": "Vocals",
  "uri": "file:///.../jobs/job-123/vocals.wav",
  "mimeType": "audio/wav",
  "durationSeconds": 183.4,
  "sampleRate": 44100,
  "channels": 2,
  "sizeBytes": 64512044
}
```

`name` is a stable machine identifier from `STEM_NAMES` / model manifest; `label` is UI-facing.

### `EngineError`

```json
{
  "code": "MODEL_CHECKSUM_MISMATCH",
  "message": "Model checksum does not match manifest.",
  "recoverable": true,
  "details": {
    "modelId": "vocal-instrumental-example-v1",
    "path": "models/onnx/vocal-instrumental-example-v1.onnx"
  }
}
```

Suggested error codes:

| Code | Recoverable | Meaning |
|---|---:|---|
| `INVALID_INPUT` | no | Missing/unreadable/remote/unsupported input. |
| `INVALID_REQUEST` | no | Bad mode/options/outputDir. |
| `JOB_NOT_FOUND` | no | Unknown job id. |
| `MODEL_NOT_FOUND` | yes | Required model missing/not installed. |
| `MODEL_CHECKSUM_MISMATCH` | yes | Model file failed SHA-256 verification. |
| `MODEL_LOAD_FAILED` | maybe | Runtime could not load model/session. |
| `OUT_OF_MEMORY` | maybe | Device memory/buffer limit exceeded. |
| `INSUFFICIENT_STORAGE` | yes | Not enough space for outputs/temp files. |
| `DECODE_FAILED` | maybe | Audio decode/probe failed. |
| `INFERENCE_FAILED` | maybe | Runtime inference failed or produced invalid output. |
| `ENCODE_FAILED` | maybe | Stem encoding/write failed. |
| `CANCELLED` | yes | Cooperative cancellation completed. |
| `INTERNAL_ERROR` | maybe | Unexpected native error; include safe details. |

## Events

Native emits job lifecycle events. JS `subscribe(jobId, onEvent)` filters by `job.id`.

### Event envelope

```json
{
  "type": "job_updated",
  "job": { "...": "Job payload" }
}
```

### Event types

| Type | When emitted | Required job.status |
|---|---|---|
| `job_updated` | Any meaningful progress/stage/status change | current status |
| `job_completed` | Final stems registered successfully | `completed` |
| `job_failed` | Unrecoverable failure | `failed` |
| `job_cancelled` | Cooperative cancellation completed | `cancelled` |

### Event sequencing guidance

- Emit `job_updated` on stage transitions and periodic inference progress (throttle to avoid bridge spam; e.g. 2-10 Hz max).
- Emit terminal event (`job_completed`, `job_failed`, or `job_cancelled`) exactly once per job run.
- Include the full `Job` snapshot in every event so JS can replace local state without merging partials.
- `progress` is overall 0..1; `stageProgress` is stage-local 0..1.

## Expo Modules sketch

```ts
// JS wrapper shape (illustrative)
import { NativeModulesProxy, EventEmitter } from "expo-modules-core";

const emitter = new EventEmitter(NativeModulesProxy.MotfEngine);

export function subscribe(jobId: string, onEvent: (e: JobEvent) => void) {
  const sub = emitter.addListener("MotfJobEvent", (event) => {
    if (event?.job?.id === jobId) onEvent(event);
  });
  return () => sub.remove();
}
```

Native module responsibilities:

- Export async functions: `getCapabilities`, `prepare`, `startJob`, `getJob`, `listJobs`, `cancelJob`, `deleteJob`.
- Emit `MotfJobEvent` with `{ type, job }`.
- Convert platform types to bridge-safe JSON objects.

## React Native Native Module sketch

```ts
import { NativeModules, NativeEventEmitter } from "react-native";

const { MotfEngine } = NativeModules;
const emitter = new NativeEventEmitter(MotfEngine);

export function subscribe(jobId: string, onEvent: (e: JobEvent) => void) {
  const sub = emitter.addListener("MotfJobEvent", (event) => {
    if (event?.job?.id === jobId) onEvent(event);
  });
  return () => sub.remove();
}
```

iOS: implement `RCTEventEmitter` or Expo module events. Android: emit through `RCTDeviceEventEmitter` or Expo module events.

## Bridge compatibility checklist

- [ ] Method names and payload keys match this doc / `contract.ts`.
- [ ] Enums serialize as stable strings (`pending`, `model_load`, etc.).
- [ ] `progress` and `stageProgress` are clamped to 0..1.
- [ ] `Job` timestamps are ISO 8601.
- [ ] Errors use machine-readable `code` values.
- [ ] Event payload always includes full `job`.
- [ ] Cancelled jobs emit `job_cancelled`, not `job_failed`.
- [ ] No audio bytes are sent over the bridge; only local URIs/paths.