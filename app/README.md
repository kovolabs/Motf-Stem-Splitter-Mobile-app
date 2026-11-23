# Mobile App Shell (Placeholder)

This directory is reserved for the MOTF Mobile application shell.

## Intent

The app shell should be thin and delegate separation to the engine contract in [`../engine/contract.ts`](../engine/contract.ts).

The shell is responsible for:
- audio import/file picking;
- job list and progress UI;
- stem mixer/playback;
- export/share;
- settings and model management;
- permissions and background execution UX.

The shell is **not** responsible for ML inference.

## Recommended approach

Pick one after Phase 0 ADR:

1. **React Native / Expo + native modules**
   - Fast UI iteration, large ecosystem.
   - ML inference must live in native modules (Swift/Kotlin/C++), not JS.

2. **Flutter + platform channels**
   - Strong cross-platform UI.
   - ML inference in native/platform plugins.

3. **Fully native (SwiftUI + Kotlin/Compose)**
   - Best platform integration and performance control.
   - More duplicated UI work.

## Minimum screens

- **Import / New Job** - pick file, choose mode, start.
- **Jobs** - queue/history, progress, errors, retry/cancel/delete.
- **Player/Mixer** - stem playback, mute/solo, volume, seek, export.
- **Settings** - model management, storage cleanup, quality/performance, diagnostics.

## Integration rule

The UI must read available modes from `engine.getCapabilities()`. Do not hardcode desktop modes that the mobile engine cannot actually run.