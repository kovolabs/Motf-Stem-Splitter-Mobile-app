# Model Selection - Vocal/Instrumental (MVP)

## Status

**Candidate identified - evaluation pending (no model approved for shipping yet).**

Primary candidate for the Phase 1 `vocal_instrumental` spike: **UVR-MDX-NET-Inst_HQ_3.onnx** (MDX-Net, vocal/instrumental 2-stem). It fits the MVP size/format target, but **license/provenance verification, ONNX Runtime Mobile operator compatibility, device benchmarks, and listening quality checks are still required before approval**.

Use [`MODEL_CANDIDATES.md`](./MODEL_CANDIDATES.md) for candidate research and [`MODEL_EVALUATION.md`](./MODEL_EVALUATION.md) for the detailed per-candidate evaluation checklist/template. When a model is approved, update this record with evidence, manifest path, and an explicit decision.

## Selection scope

| Field | Value |
|---|---|
| MVP mode | `vocal_instrumental` |
| Output stems | `vocals`, `instrumental` |
| Phase 1 scope | 2-stem separation only; no lead/backing split |
| Runtime target | ONNX Runtime Mobile (initial cross-platform target; see [ADR 002](adr/002-ml-runtime.md)) |
| Distribution | Downloadable model pack with SHA-256 verification and explicit consent (see [ADR 004](adr/004-model-distribution.md)) |
| Current selection | **UVR-MDX-NET-Inst_HQ_3.onnx (candidate, not approved)** |
| Selection owner | TBD |
| Last updated | 2026-11-23 |
| Pending manifest | `mobile/engine/models/uvr-mdx-net-inst-hq-3.manifest.pending.json` (placeholder checksum - does not pass validation until real hash is filled) |

## Current candidates

| Candidate | MVP fit | License verified | Evaluation status | Notes |
|---|---|---|---|---|
| **UVR-MDX-NET-Inst_HQ_3.onnx** (MDX-Net, UVR) | **Strong - primary MVP candidate** | pending (mirror states MIT; verify original provenance before shipping) | Research / pre-spike | ~64 MB ONNX, 2-stem vocal/instrumental, widely used in UVR ecosystem. Needs mobile op/memory/quality validation. |
| HTDemucs FT vocals ONNX (StemSplitio) | Yes (single-stem/vocals export) | no / pending | Research | Good quality lineage; larger (~316 MB fp16weights) and may be heavy for mobile MVP. |
| Spleeter-style 2-stem ONNX export | Baseline only | no / pending | Research | Useful quality/size baseline; likely lower quality than modern models. |

### Primary candidate details: UVR-MDX-NET-Inst_HQ_3.onnx

| Field | Value | Status |
|---|---|---|
| Model | `UVR-MDX-NET-Inst_HQ_3.onnx` | Identified |
| Mode | `vocal_instrumental` (2 stems) | Fits MVP |
| Source (mirror) | https://huggingface.co/notabilia/uvr5-models | Recorded |
| Original source | https://github.com/TRvlvr/model_repo/releases/download/all_public_uvr_models/UVR-MDX-NET-Inst_HQ_3.onnx | Recorded |
| License file (mirror) | https://huggingface.co/notabilia/uvr5-models/blob/main/UVR-MDX-NET-Inst_HQ_3.LICENSE | Recorded |
| License claim | MIT (per mirror license file); attributes UVR/Anjok07/KimberleyJSN and KUIELab-MDX-Net (arXiv:2111.12203) | **Pending verification** |
| File size | ~64 MB (per mirror README) | Recorded |
| Format | ONNX | Fits runtime direction |
| Output | Instrumental/vocal separation (confirm exact stem mapping/order during spike) | **Needs validation** |
| Mobile feasibility | Unknown - requires ONNX Runtime Mobile op support, memory, and latency benchmarks | **Needs validation** |

**Caution:** Do not ship this model until license/provenance is confirmed with evidence acceptable for redistribution in the app. The UVR model ecosystem has mixed provenance; a mirror claiming MIT is a positive signal, not final legal clearance.

Do not treat any candidate as approved until all required checks below pass and the decision section is completed.

## Required selection criteria

### 1. License and provenance checklist

| Check | Required | Status | Evidence / notes |
|---|---|---|---|
| Source URL/repo recorded | Yes | [ ] | |
| Exact model version/revision/commit recorded | Yes | [ ] | |
| Weight file provenance is clear (official vs community conversion) | Yes | [ ] | |
| License type identified | Yes | [ ] | |
| Redistribution rights compatible with app distribution | Yes | [ ] | |
| Commercial/use restrictions reviewed (if applicable) | Yes | [ ] | |
| Attribution/notice requirements recorded | Yes | [ ] | |
| Third-party model/conversion license obligations recorded | Yes | [ ] | |
| Legal sign-off or maintainer approval recorded | Yes | [ ] | |

**Rule:** "License verified" must be `yes` with evidence before bundling/downloading a model in production. `no / pending` is not acceptable for release.

### 2. ONNX export and operator check

| Check | Required | Status | Evidence / notes |
|---|---|---|---|
| Model artifact is ONNX or has a reproducible ONNX export path | Yes | [ ] | |
| ONNX opset/version recorded | Yes | [ ] | |
| Required operators supported by ONNX Runtime Mobile build on iOS | Yes | [ ] | |
| Required operators supported by ONNX Runtime Mobile build on Android | Yes | [ ] | |
| Dynamic shapes/input lengths behavior validated | Yes | [ ] | |
| FP32 baseline runs correctly before quantization | Yes | [ ] | |
| Quantization/compression plan evaluated (FP16/INT8), if needed | Conditional | [ ] | Only if size/perf requires it; recheck quality. |
| Output tensor names/shapes/stem mapping documented | Yes | [ ] | |
| NaN/Inf/clipping checks pass on representative audio | Yes | [ ] | |

### 3. Size and memory targets

Targets are initial Phase 1 gates. They should be validated on real devices and revised only with an explicit recorded decision.

| Metric | Target | Status | Evidence / notes |
|---|---|---|---|
| Download/package size | Prefer <= 200 MB per `vocal_instrumental` model pack; hard review if larger | [ ] | Record compressed and uncompressed size. |
| On-disk installed size | Record exact size; minimize duplicate artifacts | [ ] | |
| Peak runtime memory (mid-range device, 3-5 min track) | <= 1.5 GB preferred; investigate before exceeding | [ ] | |
| Minimum supported device memory class | TBD during spike | [ ] | Define after first benchmarks. |
| Thermal stability | No crash/OS kill/throttle spiral on 5 min track | [ ] | |
| Processing time | Acceptable for MVP; record real-time factor on each device | [ ] | Faster than real-time ideal, not required for spike. |

### 4. Quality and output checks

| Check | Required | Status | Evidence / notes |
|---|---|---|---|
| Output contains exactly `vocals` and `instrumental` stems | Yes | [ ] | |
| Sample rate/channels/duration match engine contract | Yes | [ ] | |
| Chunk boundary artifacts acceptable | Yes | [ ] | |
| Listening quality acceptable vs desktop baseline | Yes | [ ] | Compare against current desktop vocal separation where possible. |
| Known failure cases documented | Yes | [ ] | |

## Benchmark record

Fill this table during the Phase 1 spike. Use representative licensed/test-owned audio.

| Device | OS | Chip/RAM | Audio length | Model/runtime config | Peak memory | Time to first output | Total time | Real-time factor | Thermal notes | Result |
|---|---|---|---:|---|---:|---:|---:|---:|---|---|
| TBD iPhone (older supported) | | | 0:30 | | | | | | | |
| TBD iPhone (recent) | | | 3:00 | | | | | | | |
| TBD mid-range Android | | | 3:00 | | | | | | | |
| TBD lower-memory Android | | | 5:00 | | | | | | | |

## Decision record

| Field | Value |
|---|---|
| Decision | **Pending - primary candidate identified, not approved** |
| Selected model ID | `uvr-mdx-net-inst-hq-3` (candidate) |
| Selected version/revision | TBD (pin exact upstream revision/file hash on approval) |
| License verified | pending - mirror license indicates MIT with UVR/KUIELab-MDX-Net attribution; verify exact redistribution rights before shipping |
| Manifest path | `mobile/engine/models/uvr-mdx-net-inst-hq-3.manifest.pending.json` (placeholder checksum; fails validation by design) |
| Approved capabilities | None |
| Known limitations | Not validated on mobile ONNX Runtime; tensor I/O contract, memory, latency, thermal, and output quality unverified |
| Follow-up | Complete dev-machine steps below; record evidence in [MODEL_EVALUATION.md](./MODEL_EVALUATION.md) |

## Next steps (dev machine)

Detailed steps: [DEVELOPMENT.md - Dev machine next steps](./DEVELOPMENT.md#dev-machine-next-steps-xcode--android-studio).

1. **License/provenance approval** - verify redistribution rights for the exact `UVR-MDX-NET-Inst_HQ_3.onnx`; record evidence and attribution.
2. **Download + hash + real manifest** - outside git, run `checksum-file.mjs`, `create-manifest.mjs`, `validate-manifest.mjs`; replace pending manifest only after real SHA-256 validates.
3. **Native ONNX/audio pipeline** - implement iOS/Android stubs per `../engine/native/BRIDGE.md` and `../engine/native/shared/pipeline.md`; wire via `EXPO_PUBLIC_MOTF_ENGINE=native`.
4. **Real device validation** - mid-range iOS + Android, 30s/3min/5min, airplane mode; capture memory/thermal/time/quality.
5. **Approval gate** - only mark approved after manifest/checksum/license/benchmarks pass; keep weights out of git unless explicitly approved.

## When a model is selected

Update this file with:

1. Selected model name, ID, source, revision, and checksum.
2. Completed license/provenance checklist with evidence links.
3. ONNX operator/runtime compatibility results for iOS and Android.
4. Benchmark results on the target device matrix.
5. Final decision (`approve` / `reject` / `defer`), owner, and date.
6. A validated manifest at `mobile/engine/models/<model-id>.manifest.json`.
7. Any user-visible limitations that must be reflected in `getCapabilities()` and UI copy.
