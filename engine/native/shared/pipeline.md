# Shared Audio Pipeline

This document describes the intended on-device audio pipeline for native MOTF separation engines. It is platform-agnostic: iOS and Android implementations may use different decoders/encoders/runtime APIs, but they should follow the same stages, interfaces, and invariants.

**Status:** draft scaffold. No production inference is wired yet.

## Pipeline overview

```text
Input file (local URI)
  -> Import / Probe
  -> Decode to PCM
  -> Resample / Channel normalize
  -> Chunk / Window plan
  -> Model load / validate
  -> Inference (per chunk)
  -> Overlap-add / Reconstruct
  -> Postprocess / Normalize
  -> Encode stem files
  -> Finalize / Register artifacts
```

The engine should emit stage-aware progress through the bridge (`stage`, `stageProgress`, `progress`, `message`).

## Stage contract

| Stage | Status | Responsibility | Output | Cancellation point |
|---|---|---|---|---|
| `import` | `preparing` | Accept request, resolve URIs, create job/output dirs | validated request context | before heavy work |
| `probe` | `preparing` | Inspect container, duration, codec, sample rate, channels | `AudioMetadata` | after probe |
| `decode` | `preparing` | Decode compressed audio to PCM float32 | PCM buffer/stream | between decode blocks |
| `preprocess` | `preparing` | Resample, channel layout, gain/headroom checks, chunk plan | model-ready chunks | before inference |
| `model_load` | `preparing` | Load manifest, verify checksums, create runtime session | loaded session + manifest | before session run |
| `inference` | `running` | Run model on each chunk, collect stem tensors | raw stem chunks | between chunks |
| `postprocess` | `running` | Overlap-add, trim/pad, clamp/denorm, align stems | reconstructed stem PCM | between stems/chunks |
| `encode` | `exporting` | Encode stems to WAV/M4A/FLAC | stem files on disk | between stems |
| `finalize` | `exporting`/`completed` | Register artifacts, cleanup temp files, emit terminal event | `Job` with `stems` | before terminal emit |

Cancellation must be **cooperative**: check a cancellation flag between stages and between chunks. Cleanup temp files and mark job `cancelled`.

## Expected interfaces

These are conceptual interfaces; platform implementations can use Swift protocols, Kotlin interfaces, or internal classes.

### 1. Audio probe / decoder

```text
AudioProbe
  probe(inputUri) -> AudioMetadata

AudioDecoder
  decode(inputUri, targetSampleRate?, targetChannels?) -> PcmAudio
  decodeStream(inputUri, chunkFrames) -> Iterator<PcmChunk>   // preferred for long files
```

`AudioMetadata` should include:

- `durationSeconds`
- `sampleRate`
- `channels`
- `codec` / container (optional)
- `sizeBytes` (optional)

`PcmAudio` / `PcmChunk` should include:

- `sampleRate`
- `channels`
- `format` = `float32` (internal canonical format)
- `frames`
- `samples` (interleaved or planar; pick one and document it)

**TODOs:**

- iOS: AVFoundation / AudioToolbox / ExtAudioFile for decode and resample.
- Android: MediaExtractor + MediaCodec; consider Oboe/AAudio only if needed for playback, not required for offline file decode.
- Handle common formats: WAV, MP3, M4A/AAC, FLAC, AIFF where platform support allows.

### 2. Resampler / preprocessor

```text
AudioPreprocessor
  normalize(input: PcmAudio, manifestInput: ManifestInput) -> PcmAudio
  planChunks(input: PcmAudio, chunkSeconds, overlapSeconds) -> ChunkPlan
```

Responsibilities:

- Resample to model input sample rate (e.g. 44100 Hz).
- Convert channel layout to model expectation (mono/stereo).
- Convert to canonical `float32` range and document normalization.
- Plan fixed-size chunks with overlap for long files.

**Chunk planning guidance:**

- Default `chunkSeconds` and `overlapSeconds` should come from model manifest or capability defaults.
- Overlap must be large enough for model context and overlap-add blending; validate `overlapSeconds < chunkSeconds / 2`.
- Keep chunking deterministic for the same input/options.

### 3. Model manifest / checksum validator

```text
ModelManifestLoader
  load(mode, modelId?) -> ModelManifest

ModelChecksumVerifier
  verify(manifest) -> VerifyResult
```

Responsibilities:

- Load manifest from bundled assets or app-managed model directory.
- Validate schema-essential fields (`modelId`, `mode`, `runtime`, `files`, `input`, `output`).
- Compute SHA-256 for each model file before session creation.
- Fail with `MODEL_NOT_FOUND` or `MODEL_CHECKSUM_MISMATCH`.

**TODOs:**

- iOS: CryptoKit `SHA256` over file stream.
- Android: `MessageDigest.getInstance("SHA-256")` over file stream.
- Verify optional `sizeBytes` as a fast pre-check.

### 4. Inference runtime

```text
InferenceSession
  load(manifest, deviceOptions) -> SessionHandle
  run(chunk: TensorInput) -> TensorOutput
  close()
```

Responsibilities:

- Create runtime/session once per job when possible.
- Bind execution provider/accelerator based on capability and device health.
- Accept model-shaped tensor input; return per-stem tensor outputs.
- Release buffers/session on completion, failure, or cancellation.

**TODOs:**

- iOS: ONNX Runtime Mobile with Core ML EP where available; CPU fallback.
- Android: ONNX Runtime Mobile with NNAPI/GPU EP where available; CPU fallback.
- Validate tensor shapes against manifest/output stem contract.

### 5. Overlap-add / postprocessor

```text
StemPostprocessor
  overlapAdd(chunks: [StemChunk], plan: ChunkPlan) -> [PcmStem]
  finalizeStem(stem: PcmStem, targetFormat) -> PcmStem
```

Responsibilities:

- Reconstruct full-length stems from chunk outputs.
- Apply windowed overlap-add to avoid boundary clicks.
- Clamp to valid float range; avoid NaN/Inf propagation.
- Preserve duration/sample alignment across stems.

**TODOs:**

- Define window function (Hann/linear) per model behavior.
- Add NaN/Inf detection -> `INFERENCE_FAILED`.
- Consider optional loudness normalization only if explicitly configured; default should preserve model output.

### 6. Encoder / artifact writer

```text
StemEncoder
  encode(stem: PcmStem, outputUri, format, sampleRate?) -> StemArtifact
```

Responsibilities:

- Write stable-named outputs: `<outputDir>/<stem_name>.<ext>`.
- Encode WAV/M4A/FLAC based on request/options.
- Return artifact metadata: name, label, uri, mimeType, duration, sampleRate, channels, sizeBytes.

**TODOs:**

- iOS: AVAssetWriter/AudioFile APIs for M4A; straightforward PCM writer for WAV; FLAC may need library decision.
- Android: MediaCodec/MediaMuxer for M4A; WAV writer; FLAC via library decision.
- Ensure temp-file write then atomic move/rename where possible.

## Progress mapping

Suggested overall progress weights (tune per model/runtime):

| Stage | Progress range |
|---|---:|
| probe | 0.00 - 0.05 |
| decode | 0.05 - 0.15 |
| preprocess | 0.15 - 0.20 |
| model_load | 0.20 - 0.25 |
| inference | 0.25 - 0.80 |
| postprocess | 0.80 - 0.90 |
| encode | 0.90 - 0.98 |
| finalize | 0.98 - 1.00 |

Within `inference`, report `stageProgress = processedChunks / totalChunks` and include a human message like `Processing chunk 8/13`.

## Error handling

| Failure | Code | Notes |
|---|---|---|
| Remote/missing/unreadable input | `INVALID_INPUT` | Validate early in import/probe. |
| Bad mode/options | `INVALID_REQUEST` | Do not start heavy work. |
| Missing manifest/model file | `MODEL_NOT_FOUND` | Recoverable if user can install model. |
| SHA-256 mismatch | `MODEL_CHECKSUM_MISMATCH` | Do not load untrusted/corrupt model. |
| Decode failure | `DECODE_FAILED` | Include codec/container details when safe. |
| OOM / buffer allocation failure | `OUT_OF_MEMORY` | Suggest smaller chunk or shorter file. |
| Runtime/session/inference failure | `INFERENCE_FAILED` or `MODEL_LOAD_FAILED` | Include runtime error detail, no secrets. |
| Encode/write failure | `ENCODE_FAILED` | Check storage permissions/space. |
| User cancellation | n/a - status `cancelled` | Not an error; cleanup temps. |

## Cleanup & temp files

- Use a per-job temp directory under app-managed storage.
- Delete temp PCM/chunk files on success, failure, and cancellation unless a debug flag is explicitly enabled.
- Do not delete final stem artifacts on failure unless they are incomplete/corrupt; if retained, mark clearly in job warnings/details.
- On cancellation, prefer deleting incomplete outputs.

## Open TODOs

- Finalize canonical PCM layout (interleaved vs planar) per runtime.
- Define model capability defaults for chunk/overlap per mode.
- Decide WAV-first MVP encoding; add M4A/FLAC after decode/encode path is stable.
- Add persistent job store and startup reconciliation.
- Add device-budget policy (thermal/memory) before enabling concurrent jobs.