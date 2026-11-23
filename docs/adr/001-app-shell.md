# ADR 001 - Mobile App Shell

- **Status:** Accepted
- **Date:** 2026-11-21
- **Decision confirmed:** 2026-11-21 - Expo + native modules for MVP.

## Context

MOTF Mobile needs an iOS/Android app shell for import, job management, progress, stem playback/mixing, and export. The separation engine must run offline on-device and will require native ML/runtime integration.

We need a shell that allows fast UI iteration while not blocking native engine work.

## Decision

Use **React Native with Expo (custom dev client)** for the initial app shell, and implement the separation engine as **native modules** (iOS Swift/Obj-C++, Android Kotlin/C++) behind the `SeparationEngine` contract.

## Alternatives considered

### Fully native (SwiftUI + Jetpack Compose)
- Pros: best platform integration, simplest native ML integration, best performance control.
- Cons: two UI codebases, slower product iteration.

### Flutter + platform channels
- Pros: strong cross-platform UI, good performance, single UI codebase.
- Cons: Dart/Flutter toolchain not currently present in repo; team familiarity unknown.

### React Native / Expo
- Pros: JS/TS ecosystem aligns with existing landing page tooling; fast UI iteration; can bridge to native modules.
- Cons: ML inference must never run in JS; Expo managed workflow insufficient for custom native ML - requires custom dev client/EAS or prebuild.

## Consequences

- UI code is cross-platform; engine code is native.
- The `engine/contract.ts` interface is the boundary. JS only orchestrates jobs and renders state.
- We must use Expo prebuild/custom dev client for ONNX Runtime / Core ML / NNAPI integrations.
- Performance-sensitive audio processing and inference stay in native code.

## Revisit when

- Native module complexity becomes disproportionate.
- We need deep platform audio/MIDI/background behavior that fights RN.
- Team prefers Flutter/native and the spike proves it cheaper.