# ADR 002 - ML Runtime

- **Status:** Proposed
- **Date:** 2026-11-21

## Context

Desktop MOTF uses Python/PyTorch tools (Demucs, drumsep, audio-separator). Mobile requires on-device inference with mobile-friendly runtimes and model formats.

The runtime must support offline inference, acceptable performance, and a path to both iOS and Android.

## Decision

Use **ONNX Runtime Mobile** as the initial cross-platform inference runtime for the engine spike.

- iOS: ONNX Runtime with Core ML execution provider where beneficial, CPU fallback.
- Android: ONNX Runtime with NNAPI/XNNPACK execution providers where beneficial, CPU fallback.

Keep the engine API runtime-agnostic so platform-specific backends (pure Core ML on iOS, LiteRT on Android) can be added later if needed.

## Alternatives considered

### Core ML (iOS) + LiteRT (Android)
- Pros: best native platform integration.
- Cons: two model conversion/deployment paths, two runtime integrations, higher MVP cost.

### LiteRT/TFLite everywhere
- Pros: mature mobile story, especially Android.
- Cons: PyTorch-to-TFLite conversion can be painful depending on model/operators.

### ExecuTorch
- Pros: PyTorch-aligned direction.
- Cons: maturity/operator coverage/runtime packaging need careful validation for this use case.

## Consequences

- Models must be exportable to ONNX and validated on both platforms.
- We need operator-compatibility checks early in Phase 1 spike.
- The engine contract must not expose ONNX-specific types.
- If ONNX performance is insufficient on iOS, we can add a Core ML backend behind the same contract.

## Validation required

- Export candidate model to ONNX.
- Run on representative 30s/3min/5min audio.
- Measure memory, latency, thermal behavior, and output quality.
- Verify no unsupported operators in mobile build.