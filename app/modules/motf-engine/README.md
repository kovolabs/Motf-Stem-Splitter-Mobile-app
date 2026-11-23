# motf-engine (Expo Module Scaffold)

Local Expo Modules scaffold for the MOTF on-device separation engine bridge.

## Status

**Scaffold only - not wired to real ONNX Runtime.**

This directory defines the JS/native module surface for the future mobile separation engine. It exists so the app can evolve toward a real native implementation without changing the `SeparationEngine` contract used by UI code.

## What this contains

- `package.json` - local module metadata.
- `expo-module.config.json` - Expo Modules autolinking config.
- `index.ts` - module exports.
- `src/MotfEngine.types.ts` - bridge types (re-exported from `mobile/engine/contract.ts`).
- `src/MotfEngineModule.ts` - JS wrapper around the native `MotfEngine` module and `MotfJobEvent` subscription helper.
- `ios/MotfEngineModule.swift` - Expo Module stub implementing bridge methods and event declaration.
- `android/src/main/java/com/motf/engine/MotfEngineModule.kt` - Expo Module stub implementing bridge methods and event declaration.

## Bridge contract

The module follows the bridge contract in:

- [`../../../engine/native/BRIDGE.md`](../../../engine/native/BRIDGE.md)
- [`../../../engine/contract.ts`](../../../engine/contract.ts)

Native methods:

- `getCapabilities()`
- `prepare({ mode, options? })`
- `startJob(request)`
- `getJob({ jobId })`
- `listJobs()`
- `cancelJob({ jobId })`
- `deleteJob({ jobId, options? })`

Native event:

- `MotfJobEvent` with payload `{ type, job }`

## Not implemented yet

- ONNX Runtime Mobile / Core ML / NNAPI session wiring.
- Model manifest loading and SHA-256 verification in the module.
- Real audio decode/preprocess/inference/postprocess/encode pipeline.
- Persistent job store and artifact cleanup.
- App wiring through Expo custom dev client / EAS build.

## Intended integration

`mobile/app/src/engine/engineBridge.ts` selects the active engine. Today it uses the mock engine. When the native module is ready, the bridge should switch to a `NativeMotfEngine` adapter that delegates to this module and keeps the same `SeparationEngine` interface.

## Local development note

This module is scaffolded inside the app repo. Before using it in a real build, wire it into the Expo app (custom dev client/prebuild) and install dependencies. `npm install` was intentionally not run as part of this scaffold.
