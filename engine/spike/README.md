# Engine Spike

## Goal

Prove that one mobile-compatible separation model can run **offline on-device** through the MOTF engine contract.

This spike is intentionally narrow. It does **not** aim for desktop parity.

## MVP spike target

- **Mode:** `vocal_instrumental` (2 stems)
- **Runtime:** ONNX Runtime Mobile
- **Platforms:** iOS and Android
- **Input:** local WAV/MP3/M4A, 30s-5min
- **Output:** `vocals.wav` (or m4a) + `instrumental.wav`

## What the spike must prove

1. Model loads on-device from app-managed storage.
2. Audio decodes and resamples to model-required format.
3. Inference runs without network access.
4. Output stems are written, playable, and correctly labeled.
5. Job progress/events can drive UI state.
6. Cancellation and failures are handled cleanly.

## What the spike does not need

- Full 6-stem separation
- Drum sub-split
- Lead/backing vocal split
- Cloud sync
- App Store/Play Store release

## Suggested spike steps

1. **Select candidate model** - pick an ONNX-exportable vocal/instrumental model with clear license.
2. **Create model manifest** - use `engine/manifest.schema.json`.
3. **Validate manifest** - `node mobile/scripts/validate-manifest.mjs mobile/engine/models/<manifest>.json`.
4. **Build native engine harness** - minimal iOS/Android command/app harness that calls ONNX Runtime.
5. **Run golden audio** - short licensed/test-owned fixtures.
6. **Measure** - runtime, peak memory, thermal, output quality.
7. **Bridge to app shell** - expose through `SeparationEngine` contract.

## Metrics to capture

| Metric | Why |
|---|---|
| Model load time | Startup/first-run UX |
| Peak memory | Mobile OOM risk |
| Time per minute of audio | User expectation |
| Thermal throttling | Sustained usability |
| Output integrity | Correct duration/channels/sample rate/no NaNs |
| Subjective quality | Listening test vs desktop/reference |

## Exit criteria

The spike is successful when a 3-minute test track can be separated into two stems on at least one mid-range iOS device and one mid-range Android device, fully offline, with reproducible results and acceptable resource usage.