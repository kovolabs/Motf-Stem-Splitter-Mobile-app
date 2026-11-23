# Shared Native Core (Future)

If iOS and Android implementations duplicate too much audio/inference logic, extract a shared core here.

## Candidates

- **C++** with ONNX Runtime C API - portable, but more build complexity.
- **Rust** - possible, but adds toolchain/build complexity for mobile bindings.
- **Keep separate Swift/Kotlin** - acceptable for MVP if logic stays small.

## Rule

Do not introduce shared-core complexity before the first engine spike proves the pipeline. Start simple, extract only proven duplication.

## Current shared docs

- [`pipeline.md`](pipeline.md) - platform-agnostic audio pipeline stages, interfaces, progress mapping, and cleanup/error TODOs.