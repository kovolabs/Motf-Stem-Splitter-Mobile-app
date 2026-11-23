# Native Engine Layer

This directory contains platform-native separation engine implementations.

## Role

The native layer implements the `SeparationEngine` contract for mobile devices. It handles:

- model loading/validation
- audio decode/resample/preprocess
- ONNX Runtime / Core ML / LiteRT inference
- chunking and overlap-add reconstruction
- stem encoding and file output
- progress/cancellation/error reporting

The JS/TS app shell must not run inference.

## Structure

```text
native/
  README.md
  BRIDGE.md                  # JS<->native bridge contract (methods, payloads, events)
  ios/
    MotfEngine.swift         # Swift contract/protocol + MotfOnnxEngine stub
  android/
    MotfEngine.kt            # Kotlin contract/interface + MotfOnnxEngine stub
  shared/
    README.md                # Notes for shared C++/ONNX core if adopted
    pipeline.md              # Shared audio pipeline stages and expected interfaces
```

## Implementation notes

- Keep the contract aligned with `mobile/engine/contract.ts`.
- Return stable stem names from `STEM_NAMES`.
- Emit stage-aware progress updates.
- Make cancellation cooperative between chunks.
- Verify model checksums before loading.
- Never upload audio; all processing is local.