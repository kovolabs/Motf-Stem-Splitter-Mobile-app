import ExpoModulesCore

/// Expo Modules scaffold for the MOTF separation engine.
///
/// SCAFFOLD ONLY - NOT WIRED TO REAL ONNX RUNTIME.
/// This module defines the JS <-> native bridge surface described in:
/// - mobile/engine/native/BRIDGE.md
/// - mobile/engine/contract.ts
///
/// TODO(ios-engine): wire to a real MotfEngine implementation (e.g.
/// mobile/engine/native/ios/MotfEngine.swift MotfOnnxEngine) once ONNX Runtime
/// Mobile / Core ML integration is ready. Keep method names, payloads, and event
/// names stable across platforms.
public class MotfEngineModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MotfEngine")

    /// Emitted as { type: "job_updated"|"job_completed"|"job_failed"|"job_cancelled", job: Job }
    Events("MotfJobEvent")

    AsyncFunction("getCapabilities") { () -> [String: Any] in
      // TODO(ios-engine): return real device/runtime/model capabilities.
      return [
        "engineVersion": "0.0.0-native-scaffold",
        "platform": "ios",
        "deviceModel": NSNull(),
        "offline": true,
        "runtimes": [],
        "accelerators": [],
        "modes": [],
        "maxInputMinutes": NSNull(),
        "maxFileSizeBytes": NSNull(),
      ]
    }

    AsyncFunction("prepare") { (args: [String: Any]) -> [String: Any] in
      let mode = args["mode"] as? String ?? "unknown"
      // TODO(ios-engine): resolve manifest, verify checksums, warm ONNX session.
      return [
        "ok": false,
        "warnings": ["Native iOS engine scaffold: prepare not implemented."],
        "error": [
          "code": "NOT_IMPLEMENTED",
          "message": "Native iOS engine scaffold has no ONNX Runtime wired for mode '\(mode)'.",
          "recoverable": false,
        ],
      ]
    }

    AsyncFunction("startJob") { (request: [String: Any]) -> [String: Any] in
      // TODO(ios-engine): validate request, create/persist job, dispatch pipeline.
      // TODO(ios-engine): emit MotfJobEvent updates as the pipeline progresses.
      let jobId = (request["jobId"] as? String) ?? UUID().uuidString
      let now = ISO8601DateFormatter().string(from: Date())
      return [
        "id": jobId,
        "inputUri": request["inputUri"] as? String ?? "",
        "displayName": request["displayName"] as? String ?? "Untitled audio",
        "mode": request["mode"] as? String ?? "unknown",
        "status": "failed",
        "progress": 0.0,
        "stage": NSNull(),
        "stageProgress": NSNull(),
        "message": "Native iOS engine scaffold: startJob not implemented.",
        "createdAt": now,
        "updatedAt": now,
        "startedAt": NSNull(),
        "completedAt": now,
        "outputDir": request["outputDir"] as? String ?? "",
        "stems": [],
        "warnings": [],
        "error": [
          "code": "NOT_IMPLEMENTED",
          "message": "Native iOS engine scaffold has no ONNX Runtime wired yet.",
          "recoverable": false,
        ],
      ]
    }

    AsyncFunction("getJob") { (args: [String: Any]) -> [String: Any]? in
      // TODO(ios-engine): look up job from persistent/in-memory store.
      _ = args["jobId"] as? String
      return nil
    }

    AsyncFunction("listJobs") { () -> [[String: Any]] in
      // TODO(ios-engine): return persisted jobs, newest first.
      return []
    }

    AsyncFunction("cancelJob") { (args: [String: Any]) -> [String: Any] in
      let jobId = args["jobId"] as? String ?? ""
      // TODO(ios-engine): cooperative cancellation; emit job_cancelled.
      return [
        "ok": false,
        "jobId": jobId,
        "status": "failed",
        "error": [
          "code": "NOT_IMPLEMENTED",
          "message": "Native iOS engine scaffold: cancelJob not implemented.",
          "recoverable": false,
        ],
      ]
    }

    AsyncFunction("deleteJob") { (args: [String: Any]) in
      // TODO(ios-engine): delete job metadata and optionally output files.
      _ = args["jobId"] as? String
      _ = args["options"] as? [String: Any]
    }
  }

  // TODO(ios-engine): add helper to emit MotfJobEvent.
  // private func emitJobEvent(type: String, job: [String: Any]) {
  //   sendEvent("MotfJobEvent", ["type": type, "job": job])
  // }
}
