package com.motf.engine

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.time.Instant
import java.util.UUID

/**
 * Expo Modules scaffold for the MOTF separation engine.
 *
 * SCAFFOLD ONLY - NOT WIRED TO REAL ONNX RUNTIME.
 * This module defines the JS <-> native bridge surface described in:
 * - mobile/engine/native/BRIDGE.md
 * - mobile/engine/contract.ts
 *
 * TODO(android-engine): wire to a real MotfEngine implementation (e.g.
 * mobile/engine/native/android/MotfEngine.kt MotfOnnxEngine) once ONNX Runtime
 * Mobile / NNAPI integration is ready. Keep method names, payloads, and event
 * names stable across platforms.
 */
class MotfEngineModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MotfEngine")

    // Emitted as { type: "job_updated"|"job_completed"|"job_failed"|"job_cancelled", job: Job }
    Events("MotfJobEvent")

    AsyncFunction("getCapabilities") {
      // TODO(android-engine): return real device/runtime/model capabilities.
      mapOf(
        "engineVersion" to "0.0.0-native-scaffold",
        "platform" to "android",
        "deviceModel" to null,
        "offline" to true,
        "runtimes" to emptyList<String>(),
        "accelerators" to emptyList<String>(),
        "modes" to emptyList<Any>(),
        "maxInputMinutes" to null,
        "maxFileSizeBytes" to null,
      )
    }

    AsyncFunction("prepare") { args: Map<String, Any?> ->
      val mode = args["mode"] as? String ?: "unknown"
      // TODO(android-engine): resolve manifest, verify checksums, warm ONNX session.
      mapOf(
        "ok" to false,
        "warnings" to listOf("Native Android engine scaffold: prepare not implemented."),
        "error" to mapOf(
          "code" to "NOT_IMPLEMENTED",
          "message" to "Native Android engine scaffold has no ONNX Runtime wired for mode '$mode'.",
          "recoverable" to false,
        ),
      )
    }

    AsyncFunction("startJob") { request: Map<String, Any?> ->
      // TODO(android-engine): validate request, create/persist job, dispatch pipeline.
      // TODO(android-engine): emit MotfJobEvent updates as the pipeline progresses.
      val jobId = request["jobId"] as? String ?: UUID.randomUUID().toString()
      val now = Instant.now().toString()
      mapOf(
        "id" to jobId,
        "inputUri" to (request["inputUri"] as? String ?: ""),
        "displayName" to (request["displayName"] as? String ?: "Untitled audio"),
        "mode" to (request["mode"] as? String ?: "unknown"),
        "status" to "failed",
        "progress" to 0.0,
        "stage" to null,
        "stageProgress" to null,
        "message" to "Native Android engine scaffold: startJob not implemented.",
        "createdAt" to now,
        "updatedAt" to now,
        "startedAt" to null,
        "completedAt" to now,
        "outputDir" to (request["outputDir"] as? String ?: ""),
        "stems" to emptyList<Any>(),
        "warnings" to emptyList<String>(),
        "error" to mapOf(
          "code" to "NOT_IMPLEMENTED",
          "message" to "Native Android engine scaffold has no ONNX Runtime wired yet.",
          "recoverable" to false,
        ),
      )
    }

    AsyncFunction("getJob") { args: Map<String, Any?> ->
      // TODO(android-engine): look up job from persistent/in-memory store.
      val jobId = args["jobId"] as? String
      jobId?.let { null }
      null
    }

    AsyncFunction("listJobs") {
      // TODO(android-engine): return persisted jobs, newest first.
      emptyList<Any>()
    }

    AsyncFunction("cancelJob") { args: Map<String, Any?> ->
      val jobId = args["jobId"] as? String ?: ""
      // TODO(android-engine): cooperative cancellation; emit job_cancelled.
      mapOf(
        "ok" to false,
        "jobId" to jobId,
        "status" to "failed",
        "error" to mapOf(
          "code" to "NOT_IMPLEMENTED",
          "message" to "Native Android engine scaffold: cancelJob not implemented.",
          "recoverable" to false,
        ),
      )
    }

    AsyncFunction("deleteJob") { args: Map<String, Any?> ->
      // TODO(android-engine): delete job metadata and optionally output files.
      val jobId = args["jobId"] as? String
      val options = args["options"] as? Map<String, Any?>
      Unit
    }
  }

  // TODO(android-engine): add helper to emit MotfJobEvent.
  // private fun emitJobEvent(type: String, job: Map<String, Any?>) {
  //   sendEvent("MotfJobEvent", mapOf("type" to type, "job" to job))
  // }
}
