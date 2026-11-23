# Model Evaluation

## Purpose

Use this document as a practical checklist when evaluating a mobile separation model candidate. A candidate is only "approved" after it passes license review, technical validation, device testing, and a documented decision.

## How to use

1. Copy the template below into a new note/issue/PR description for the candidate.
2. Fill in evidence as you go. Link to benchmarks, manifests, logs, and listening notes.
3. Do not ship or bundle a model until license/redistribution status is clear.
4. Store the final manifest in `mobile/engine/models/<model-id>.manifest.json`.
5. For the confirmed Phase 1 MVP (`vocal_instrumental`, 2 stems only), record the active selection decision in [`MODEL_SELECTION.md`](./MODEL_SELECTION.md). See [`MODEL_CANDIDATES.md`](./MODEL_CANDIDATES.md) for current candidate research.

## Candidate evaluation template

### Metadata

| Field | Value |
|---|---|
| Candidate name | |
| Model ID | |
| Source URL / repo | |
| Version / revision | |
| Intended mode | `vocal_instrumental` / `vocal_split` / `drum_split` / `full_stems` |
| Runtime target | `onnxruntime` / `coreml` / `litert` / `executorch` / `custom` |
| Evaluator | |
| Date | |
| Status | `research` / `spike` / `approved` / `rejected` |

### Evaluation checklist

| Area | Check | Status | Evidence / notes |
|---|---|---|---|
| License | License type identified and documented | [ ] | |
| License | Redistribution/use rights compatible with intended app distribution | [ ] | |
| License | Attribution/notice requirements recorded | [ ] | |
| Export | Model format available or export path verified | [ ] | |
| Export | Required operators supported by target mobile runtime | [ ] | |
| Checksum | Model file SHA-256 and size recorded | [ ] | Use `node mobile/scripts/checksum-file.mjs <file>` |
| Manifest | Manifest template created and validates | [ ] | Use `node mobile/scripts/create-manifest.mjs ...` then `node mobile/scripts/validate-manifest.mjs <manifest.json>` |
| Desktop sanity | Runs on desktop/runtime sanity check before mobile integration | [ ] | |
| Desktop sanity | Output stems have expected names, sample rate, channels, duration | [ ] | |
| Desktop sanity | No NaNs/infs/clipping explosions on representative audio | [ ] | |
| Mobile run | Runs on target iOS device | [ ] | |
| Mobile run | Runs on target Android device | [ ] | |
| Memory/runtime | Peak memory within budget on representative 3-5 min track | [ ] | |
| Memory/runtime | Processing time acceptable on target devices | [ ] | |
| Memory/runtime | Thermal/throttling behavior acceptable | [ ] | |
| Quality | Listening test compared against desktop/baseline | [ ] | |
| Quality | Chunk boundary artifacts acceptable | [ ] | |
| Quality | Failure cases / known bad inputs documented | [ ] | |
| Decision | Final decision recorded with owner and date | [ ] | |

### Device benchmark table

| Device | OS | Audio length | Peak memory | Time to first output | Total time | Thermal notes | Result |
|---|---|---:|---:|---:|---:|---|---|
| Example: iPhone 13 | iOS 18 | 3:00 | 900 MB | 12 s | 95 s | Warm, no throttling | Pass |
| | | | | | | | |
| | | | | | | | |

### Quality notes

| Test clip | Baseline | Candidate result | Issues | Verdict |
|---|---|---|---|---|
| | Desktop/current model | | Bleed, artifacts, missing transients, etc. | |
| | | | | |

### Decision

- **Decision:** `approve` / `reject` / `defer`
- **Reason:** 
- **Approved modes/capabilities:** 
- **Known limitations:** 
- **Required follow-up:** 
- **Manifest path:** `mobile/engine/models/<model-id>.manifest.json`

## Practical commands

```bash
# Compute checksum and size for a model file
node mobile/scripts/checksum-file.mjs /path/to/model.onnx

# Generate a manifest template with real checksum/size
node mobile/scripts/create-manifest.mjs \
  --model-id my-model \
  --mode vocal_instrumental \
  --runtime onnxruntime \
  --file /path/to/model.onnx \
  --stems vocals,instrumental \
  --version 0.1.0 \
  --sample-rate 44100 \
  --channels 2 \
  --format float32

# Validate the manifest
node mobile/scripts/validate-manifest.mjs mobile/engine/models/my-model.manifest.json
```

## Notes

- Keep evaluation evidence reproducible: record exact model revision, file checksum, device, OS, and test audio.
- Prefer small, licensed or test-owned audio fixtures for repeatable checks.
- Do not commit large model weights by default; commit manifests and documentation unless there is an explicit decision to bundle/distribute weights.
