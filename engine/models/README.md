# Mobile Engine Models

This directory holds model manifests and model-related documentation for the mobile engine.

## Default policy: no weights committed

**Do not commit large model weights to this repository by default.** Model files are often large, have specific license/redistribution terms, and may be distributed separately (downloaded on demand, bundled in a release artifact, or stored in approved artifact storage).

What should normally be committed here:
- `*.manifest.json` files describing approved/evaluated models.
- Documentation and evaluation notes.
- License/attribution records.

What should normally **not** be committed here:
- Raw model weights (`.onnx`, `.mlpackage`, `.tflite`, `.pte`, etc.) unless there is an explicit, reviewed decision to vendor them.
- Temporary downloads, caches, or converted intermediates.

If you need local weights for development, keep them ignored/local or in an approved artifact location, and reference them by manifest.

## Manifests

A manifest is the source of truth for how the mobile engine loads a model. The schema lives at [`../manifest.schema.json`](../manifest.schema.json).

Typical fields:
- `modelId`, `mode`, `version`, `runtime` - identify what the model is and where it runs.
- `files[]` - model files with `path`, `sha256`, and optional `sizeBytes`.
- `input` - expected sample rate, channels, and tensor format.
- `output.stems` - stem names produced by the model.
- `license` - license/attribution metadata.
- `notes` - known limitations or implementation notes.

Validate manifests before use:

```bash
node mobile/scripts/validate-manifest.mjs mobile/engine/models/<model-id>.manifest.json
```

## Checksums

Every model file in a manifest should include a SHA-256 checksum and size. Checksums protect against corrupted downloads, accidental file swaps, and silent changes.

Generate checksum/size:

```bash
node mobile/scripts/checksum-file.mjs /path/to/model.onnx
```

Generate a manifest template with checksum/size filled in:

```bash
node mobile/scripts/create-manifest.mjs \
  --model-id my-model \
  --mode vocal_instrumental \
  --runtime onnxruntime \
  --file /path/to/model.onnx \
  --stems vocals,instrumental
```

## Licensing

Before adding or approving a model:
- Record the source URL/repo and exact revision/version.
- Record the license and whether redistribution is allowed.
- Record attribution requirements and any usage restrictions.
- Keep evidence in the evaluation doc/PR and include required notices in app/legal docs.

**Do not ship a model just because weights are downloadable.** Confirm the license and distribution terms first.

## Current files

- `vocal_instrumental.example.manifest.json` - schema/example only; placeholder checksum intentionally fails validation.
- `uvr-mdx-net-inst-hq-3.manifest.pending.json` - **primary MVP candidate manifest (pending)**. Real SHA-256, license/provenance verification, tensor contract validation, and device benchmarks required before use.

## Recommended workflow

1. Evaluate candidate using [`../../docs/MODEL_EVALUATION.md`](../../docs/MODEL_EVALUATION.md).
2. Create manifest with `create-manifest.mjs`.
3. Validate manifest with `validate-manifest.mjs`.
4. Commit manifest/docs; keep weights out of git unless explicitly approved.
5. Record device benchmarks and known limitations before enabling the mode in app UI.
