# Model Candidates (Mobile Spike)

## Status

Research notes for Phase 1. **No candidate is approved for shipping yet.** Every candidate must pass license review, ONNX/mobile runtime validation, device benchmarks, and listening tests.

**MVP target:** `vocal_instrumental` (2 stems: vocals, instrumental) - confirmed Phase 1 spike mode per [ADR 003](adr/003-mvp-mode.md). Lead/backing separation (`vocal_split`) is post-spike and out of scope for this selection. See [MODEL_SELECTION.md](MODEL_SELECTION.md) for the active selection record.

## Evaluation criteria

| Criterion | Requirement |
|---|---|
| License | Clear, compatible with intended distribution/usage |
| Format | ONNX export available or feasible; mobile runtime operator support |
| Size | Acceptable for download/bundle; preferably < 200 MB per mode for MVP |
| Memory | Runs on mid-range devices without OOM on 3-5 min tracks |
| Quality | Acceptable subjective quality vs desktop baseline |
| Latency | Reasonable on-device processing time |
| Outputs | Stable stem names and sample rates |

## Candidates to evaluate

### 1. HTDemucs FT vocals ONNX (StemSplitio)

- **Source:** `StemSplitio/htdemucs-ft-vocals-onnx` / `StemSplitio/htdemucs-ft-onnx` (Hugging Face)
- **Mode fit:** `vocal_instrumental` or `full_stems` (4-stem bag)
- **MVP target:** Yes - `vocal_instrumental` only (evaluate single-stem/vocals export; do not use 4-stem bag for Phase 1 spike)
- **License verified:** no / pending (verify upstream model license, weight redistribution rights, and attribution requirements before any download/bundle)
- **Pros:** HTDemucs quality lineage; ONNX exports exist; no PyTorch required at inference.
- **Risks:** Model/bag size and memory may be high for mobile; 4-stem bag is heavier than MVP; operator/runtime compatibility on mobile EPs must be verified; license/weight redistribution terms must be verified before bundling.
- **Spike use:** Evaluate single-stem/vocals ONNX first, not full 4-stem bag.

### 2. UVR-MDX-NET-Inst_HQ_3.onnx (MDX-Net / UVR) - **Primary MVP candidate**

- **Source:** [notabilia/uvr5-models](https://huggingface.co/notabilia/uvr5-models/blob/main/UVR-MDX-NET-Inst_HQ_3.onnx) (mirror); original: [TRvlvr/model_repo](https://github.com/TRvlvr/model_repo/releases/download/all_public_uvr_models/UVR-MDX-NET-Inst_HQ_3.onnx)
- **Mode fit:** `vocal_instrumental` (2 stems: vocals/instrumental)
- **MVP target:** **Yes - primary Phase 1 spike candidate**
- **License verified:** pending (mirror includes MIT license file attributing UVR/Anjok07/KimberleyJSN and KUIELab-MDX-Net/arXiv:2111.12203; original provenance/redistribution must be confirmed before shipping)
- **Size:** ~63.7 MB (`x-linked-size: 66759214` from HF resolve headers, checked 2026-11-21)
- **Pros:** Small download size for mobile; simple 2-stem output; widely used/understood in UVR ecosystem; ONNX format already available.
- **Risks:** License/provenance needs final confirmation; ONNX Runtime Mobile operator compatibility unverified; model input/output tensor contract (chunk size, overlap, stem order) must be validated; quality/latency/memory on mid-range phones unknown.
- **Spike use:** First candidate for native ONNX Runtime Mobile spike. Validate tensor I/O, chunking, and device performance before approving.

### 3. Spleeter-style 2-stem ONNX exports

- **Source:** Deezer Spleeter family / community ONNX exports.
- **Mode fit:** `vocal_instrumental`
- **MVP target:** Baseline only - `vocal_instrumental` mode fit, but quality may not meet product target
- **License verified:** no / pending (verify Spleeter weight license and terms for any specific ONNX export/redistribution)
- **Pros:** Simple 2-stem target; well-known baseline.
- **Risks:** Quality lower than modern Demucs/Roformer models; old architecture; conversion quality varies.
- **Spike use:** Useful as baseline/benchmark, not necessarily final quality target.

### 4. Open-Unmix / UMXL ONNX

- **Source:** Open-Unmix project; ONNX exports exist in community.
- **Mode fit:** `full_stems`/4-stem research
- **MVP target:** No - not a Phase 1 `vocal_instrumental` candidate; research fallback only
- **License verified:** no / pending (verify Open-Unmix/UMX/UMXL license and any ONNX conversion redistribution terms)
- **Pros:** Open project, research-friendly.
- **Risks:** Not SOTA quality; mobile performance still needs validation.
- **Spike use:** Fallback research candidate.

## Not MVP candidates

- **Custom first/second/floor tom model** - requires dataset + training.
- **Full desktop parity (6-stem + drum sub-split + lead/backing)** - too much for first mobile spike.
- **Remote API models** - violates offline-on-device constraint.

## Decision process

1. Pick 1-2 candidates for `vocal_instrumental` (confirmed MVP target).
2. Verify license, provenance, and redistribution rights; set "License verified" to yes/no with evidence.
3. Run ONNX Runtime Mobile on desktop first (sanity), then iOS/Android.
4. Benchmark 30s, 3min, 5min audio on target devices.
5. Compare quality against desktop Demucs vocal output.
6. Document results in [MODEL_SELECTION.md](MODEL_SELECTION.md) and create a manifest/evaluation record when approved.

## Output artifact for selected model

For any approved model, create:
- `mobile/engine/models/<model-id>.manifest.json`
- SHA-256 checksums
- license/attribution record
- benchmark report
- known limitations