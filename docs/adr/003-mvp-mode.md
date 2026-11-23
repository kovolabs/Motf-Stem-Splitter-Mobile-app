# ADR 003 - MVP Separation Mode

- **Status:** Accepted
- **Date:** 2026-11-21
- **Decision confirmed:** 2026-11-21 - MVP mode is `vocal_instrumental` (2 stems).

## Context

Desktop MOTF supports full 6-stem separation, drum sub-split, and vocal lead/backing split. Mobile has tighter memory, CPU/GPU/NPU, thermal, battery, and model-size constraints.

Shipping all desktop modes on mobile first would create high risk and likely poor quality/performance.

## Decision

**Phase 1 spike scope is `vocal_instrumental` only (2 stems: vocals, instrumental).** Lead/backing separation is deferred until after the 2-stem pipeline is proven.

MVP mode order:

1. **`vocal_instrumental`** (2 stems) - first engine spike target; only mode in Phase 1 scope.
2. **`vocal_split`** (lead, backing, instrumental) - post-spike target after the 2-stem pipeline is proven.
3. **`full_stems` / `drum_split`** - later, only after mobile-optimized models pass quality/perf gates.

The mobile UI must use `getCapabilities()` and only expose modes the engine reports as available.

## Rationale

- 2-stem separation is the smallest useful end-to-end pipeline.
- It reduces model size, memory, output validation, and QA surface.
- It proves the core mobile flow: import -> decode -> infer -> reconstruct -> export -> playback.
- Vocal split can reuse much of the same audio pipeline once the base engine works.

## Consequences

- Mobile will not claim desktop parity at launch.
- Landing page/store copy must be capability-accurate.
- Model research should prioritize high-quality 2-stem and vocal-split models with mobile-convertible paths.
- Individual tom separation remains out of scope until a viable model exists.