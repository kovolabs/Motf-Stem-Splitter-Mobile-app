# Separation Engine

## Purpose

The separation engine is the mobile component responsible for turning an input audio file into one or more stem files, fully on-device.

The engine is a **contract**, not a specific ML library. Desktop uses Python CLIs; mobile may use Core ML, ONNX Runtime Mobile, LiteRT, or a hybrid. The app should depend on the contract.

## Design goals

- **Offline**: no network required for separation.
- **Asynchronous**: separation runs as a job with progress/events.
- **Cancelable**: user can cancel long-running jobs.
- **Recoverable**: job state persists across app restarts/interruptions.
- **Observable**: clear stage/progress/error reporting.
- **Pluggable**: model/runtime implementation can change without rewriting UI.

## Engine contract

See [`../engine/contract.ts`](../engine/contract.ts) for a TypeScript-shaped contract. Native implementations should map to equivalent Swift/Kotlin/C++ interfaces.

### Core operations

```text
getCapabilities() -> EngineCapabilities
prepare(mode, options?) -> PrepareResult
startJob(request) -> Job
getJob(jobId) -> Job?
cancelJob(jobId) -> CancelResult
listJobs(filter?) -> Job[]
deleteJob(jobId, options?) -> DeleteResult
```

### Optional operations

```text
streamEvents(jobId, onEvent) -> unsubscribe
purgeCache() -> void
validateModel(modelId) -> ValidationResult
```

## Capabilities

The engine must report what it can do on the current device.

```json
{
  "engineVersion": "0.1.0",
  "platform": "ios",
  "device": "iPhone16,1",
  "offline": true,
  "modes": [
    {
      "id": "vocal_split",
      "label": "Vocal Split",
      "description": "Lead vocals, backing vocals, instrumental",
      "expectedStems": ["lead_vocals", "backing_vocals", "instrumental"],
      "available": true,
      "estimatedSpeed": "medium"
    }
  ],
  "runtimes": ["coreml"],
  "accelerators": ["ane", "cpu"],
  "maxInputMinutes": 15
}
```

The UI should render modes from capabilities, not hardcode desktop assumptions.

## Job lifecycle

```text
pending -> preparing -> running -> exporting -> completed
                  \-> failed
                  \-> cancelled
```

### Status definitions

- **pending**: accepted, not started.
- **preparing**: loading model, probing audio, allocating buffers.
- **running**: inference in progress.
- **exporting**: writing/encoding final stem files.
- **completed**: all expected stems written and registered.
- **failed**: unrecoverable error; partial outputs may exist but must be marked clearly.
- **cancelled**: user/system cancelled; partial outputs should be cleaned up or explicitly retained.

## Progress model

Progress should be stage-aware. A single 0-100% bar is acceptable in UI, but engine events should be richer.

```json
{
  "jobId": "job_123",
  "status": "running",
  "progress": 0.42,
  "stage": "inference",
  "stageProgress": 0.61,
  "message": "Processing chunk 8/13",
  "updatedAt": "2026-11-21T21:00:00Z"
}
```

Recommended stages:
- `import`
- `probe`
- `decode`
- `preprocess`
- `model_load`
- `inference`
- `postprocess`
- `encode`
- `finalize`

## Input contract

```ts
interface SeparationRequest {
  jobId?: string;
  inputUri: string;          // local file URI/path managed by app
  mode: string;              // e.g. "vocal_split"
  outputDir: string;         // app-managed output directory
  options?: {
    outputFormat?: 'wav' | 'm4a' | 'flac';
    sampleRate?: 44100 | 48000;
    quality?: 'fast' | 'balanced' | 'high';
    chunkSeconds?: number;
    overlapSeconds?: number;
    modelId?: string;
  };
}
```

Validation rules:
- reject remote URLs (`http(s)://`) for offline mode;
- verify file exists and is readable;
- probe format/duration before heavy processing;
- enforce configurable max duration/size based on device capability.

## Output contract

```ts
interface StemArtifact {
  name: string;              // stable machine name, e.g. lead_vocals
  label: string;             // UI label
  uri: string;               // local file URI
  mimeType: string;
  durationSeconds?: number;
  sampleRate?: number;
  channels?: number;
  sizeBytes?: number;
}
```

Job result:

```json
{
  "jobId": "job_123",
  "status": "completed",
  "stems": [
    { "name": "lead_vocals", "label": "Lead Vocals", "uri": "file://.../lead_vocals.m4a" },
    { "name": "backing_vocals", "label": "Backing Vocals", "uri": "file://.../backing_vocals.m4a" },
    { "name": "instrumental", "label": "Instrumental", "uri": "file://.../instrumental.m4a" }
  ],
  "warnings": []
}
```

## Audio pipeline

The mobile engine should treat inference as one stage in an audio pipeline.

```text
Input file
  -> Decode (AAC/MP3/WAV/FLAC/AIFF)
  -> Normalize channels/sample rate
  -> Chunk/window (for long files)
  -> Model inference
  -> Overlap-add / reconstruction
  -> Loudness/format-safe postprocess
  -> Encode stem files
  -> Register artifacts
```

### Important implementation details

- **Resampling**: models expect specific sample rates; resample explicitly.
- **Stereo/mono**: preserve or downmix according to model contract.
- **Chunking**: long tracks must be chunked to control memory.
- **Overlap-add**: avoid clicks at chunk boundaries.
- **Deterministic naming**: stem names must be stable (`lead_vocals`, not random filenames).
- **Intermediate cleanup**: delete temp PCM/WAV chunks unless debugging.

## Runtime options

| Runtime | iOS | Android | Notes |
|---|---:|---:|---|
| Core ML | Strong | No | Best Apple integration; needs Core ML model conversion. |
| ONNX Runtime Mobile | Yes | Yes | Good cross-platform option; model/operator support must be validated. |
| LiteRT / TFLite | Limited | Strong | Good Android path; Core ML delegate exists but ONNX often easier for PyTorch exports. |
| ExecuTorch | Emerging | Emerging | Promising PyTorch path, but evaluate maturity and operator coverage. |

Recommendation: **prototype with ONNX Runtime Mobile first** for cross-platform learning, but keep the engine contract runtime-agnostic. If performance/size requires it, allow platform-specialized backends behind the same API.

## Model packaging

Each mode should have a model manifest.

```json
{
  "modelId": "vocal-split-uvr-bve-mobile-v1",
  "mode": "vocal_split",
  "version": "1.0.0",
  "runtime": "onnxruntime",
  "files": [
    {
      "path": "models/onnx/vocal-split-v1.onnx",
      "sha256": "...",
      "sizeBytes": 123456789
    }
  ],
  "input": {
    "sampleRate": 44100,
    "channels": 2,
    "format": "float32"
  },
  "output": {
    "stems": ["lead_vocals", "backing_vocals"]
  },
  "license": "see MODELS.md"
}
```

## Failure handling

The engine must distinguish:

- **User/input errors**: unsupported format, missing file, permission denied.
- **Device/resource errors**: out of memory, thermal throttling, insufficient storage.
- **Model errors**: missing/corrupt model, checksum mismatch, unsupported operator.
- **Inference errors**: runtime failure, NaN output, invalid stem shape.

Error payload should be machine-readable:

```json
{
  "code": "MODEL_NOT_FOUND",
  "message": "Required model vocal-split-v1.onnx is missing.",
  "recoverable": true,
  "details": { "modelId": "vocal-split-v1" }
}
```

## Cancellation

Cancellation must be cooperative and prompt:
- stop between chunks when possible;
- release model/session buffers;
- delete incomplete temp outputs;
- mark job `cancelled`, not `failed`.

## Compatibility with desktop concepts

Desktop currently has modes `full_stems`, `drum_split`, `vocal_split`. Mobile can start with a subset.

Do not claim desktop parity until the mobile engine can actually produce comparable stems. The capabilities API is the source of truth.