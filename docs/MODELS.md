# Models and Mobile ML

## Purpose

This document explains how MOTF Mobile should think about separation models. It is the most important technical constraint: **mobile model quality/size/runtime support will determine what features can ship offline**.

## Key reality

Desktop MOTF can run Python/PyTorch model ecosystems (Demucs, drumsep, audio-separator). Mobile cannot assume that same ecosystem is available.

Mobile needs models that are:
- converted to mobile-compatible formats,
- licensed for redistribution/use as intended,
- small enough for device storage and memory,
- fast enough for acceptable on-device processing,
- validated for output quality.

## Mode-by-mode feasibility

| Mode | Desktop today | Mobile feasibility | Notes |
|---|---|---|---|
| Vocal split (lead/backing/instrumental) | Demucs two-stems vocals + audio-separator UVR-BVE | Medium | Best early target if a mobile-compatible vocal model is selected/converted. Two-stage pipeline may be heavy. |
| 2-stem vocal/instrumental | Easy with Demucs/audio-separator | Medium/High | Good MVP candidate; simpler output contract. |
| Full 6-stem | Demucs `htdemucs_6s` | Low/Medium | Heavy model; memory and runtime support are challenging on phones. |
| Drum split (kick/snare/hihat/cymbals/toms) | Demucs + drumsep | Medium/Low | Requires drum-specific model and postprocessing; quality/size tradeoff. |
| Individual toms (first/second/floor) | Not off-the-shelf in current desktop stack | Low | Likely requires custom training/data. Not an MVP target. |

## Confirmed MVP target

**Phase 1 spike scope is `vocal_instrumental` (2 stems: vocals, instrumental) only.** This is a confirmed decision, not an open recommendation - see [ADR 003](adr/003-mvp-mode.md).

Mode order:

1. **`vocal_instrumental` (2 stems)** - confirmed Phase 1 spike target. Proves the full mobile pipeline: import -> decode -> infer -> reconstruct -> export -> playback.
2. **`vocal_split` (lead, backing, instrumental)** - post-spike candidate after the 2-stem pipeline is proven. Not in Phase 1 scope.
3. **`full_stems` / `drum_split`** - later, only after mobile-optimized models pass quality/performance gates.

Do not promise full 6-stem + drum sub-splits + vocal lead/backing parity in the MVP. The mobile UI must expose only modes reported by `getCapabilities()`.

## Model format options

### ONNX

Pros:
- Common export target from PyTorch.
- ONNX Runtime Mobile supports iOS and Android.
- One model artifact can potentially serve both platforms.

Cons:
- Not every PyTorch model/operator exports cleanly.
- Performance may vary by operator and execution provider.
- Large models still need quantization/chunking.

### Core ML (`.mlpackage`)

Pros:
- Strong iOS integration and Apple Neural Engine potential.
- Good deployment path for Apple devices.

Cons:
- iOS-only.
- Conversion from arbitrary PyTorch models can be non-trivial.
- Separate Android path still needed.

### LiteRT / TFLite

Pros:
- Mature Android deployment path.
- Quantization tooling is common.

Cons:
- Conversion from PyTorch/ONNX may be harder depending on model.
- iOS path less straightforward than Core ML.

## Conversion pipeline (proposed)

```text
Train/select source model
  -> Verify license/redistribution rights
  -> Export to ONNX (or platform-native format)
  -> Simplify/validate operators
  -> Quantize if needed (FP16/INT8 where quality allows)
  -> Run golden-audio regression tests
  -> Package with manifest + checksum
  -> Load in mobile engine
```

### Validation checklist per model

- Output stem names/shapes are correct.
- No NaNs/infs on representative audio.
- Audio length/channels/sample rate handled correctly.
- Chunk boundary artifacts are acceptable.
- Peak/loudness behavior is safe (no clipping explosions).
- Memory use is within device budget.
- Inference time is acceptable on target devices.
- License allows intended distribution.

## Candidate model strategy

### Short term

- Evaluate existing open models that already have ONNX exports or known conversion paths for `vocal_instrumental`.
- Prefer models with clear licenses and reproducible weights.
- Use one model per shipped mode, not a huge model zoo.
- Record candidate evaluation in [`MODEL_CANDIDATES.md`](./MODEL_CANDIDATES.md) and the final selection decision in [`MODEL_SELECTION.md`](./MODEL_SELECTION.md).

### Medium term

- Build an internal model registry/manifest system.
- Deliver models as downloadable model packs after first install to reduce base app size (confirmed: [ADR 004](adr/004-model-distribution.md)).
- Add A/B evaluation harness for quality/speed.

### Long term

- Consider custom distilled/mobile-native models for MOTF-specific modes.
- Consider training/fine-tuning only when off-the-shelf models cannot meet quality/size targets.

## Audio preprocessing/postprocessing

Model quality is not only the model. Mobile engine must get audio I/O right.

- Decode with platform codecs.
- Resample to model sample rate (e.g. 44.1kHz/48kHz as required).
- Convert to expected tensor layout (channels-first/last, float32/float16).
- Chunk long audio with overlap (e.g. 5-10s overlap depending on model).
- Reconstruct with overlap-add/crossfade.
- Encode output as WAV/M4A/FLAC; keep WAV internally when needed for lossless processing.

## Performance targets (initial)

These are product targets, not guarantees. Validate on real devices.

- **App size impact**: < 150 MB for first bundled model pack if possible.
- **Memory**: avoid > 1.5 GB peak on mid-range devices for MVP mode.
- **Processing**: faster than real-time is ideal, but 1-3x real-time on modern phones may be acceptable for MVP.
- **Thermal stability**: no crash/throttle spiral on a 5-minute song.

## Licensing and compliance

Before bundling any model:

- record model source URL/repo,
- record license type,
- record whether weights are redistributed,
- record any attribution/usage restrictions,
- include notices in app/legal docs as required.

Do not ship a model just because a demo exists online.

## Desktop parity warning

Desktop currently uses:
- `htdemucs_6s` for full stems
- Demucs two-stems + drumsep for drum split
- Demucs two-stems + audio-separator UVR-BVE for vocal split

Mobile should **not** claim these exact internals unless the same behavior is truly reproduced. Instead, expose capability-based modes:

- `vocal_instrumental`
- `vocal_split`
- `drum_split`
- `full_stems`

and only enable modes that pass quality/performance tests on target devices.