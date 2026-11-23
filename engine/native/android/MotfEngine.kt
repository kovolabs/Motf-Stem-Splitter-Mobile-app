package com.motf.engine

import java.io.File
import java.time.Instant
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CopyOnWriteArrayList

/**
 * MOTF Mobile native engine contract + ONNX Runtime Mobile stub (Android).
 *
 * Status: scaffold/stub. Methods are compile-shaped but not fully implemented.
 * Real inference should be wired behind [MotfOnnxEngine] using ONNX Runtime Mobile
 * (NNAPI/GPU/CPU EPs as available) without changing the JS bridge contract.
 *
 * Keep aligned with:
 * - mobile/engine/contract.ts
 * - mobile/docs/ENGINE.md
 * - mobile/engine/native/BRIDGE.md
 */

// ---------------------------------------------------------------------------
// Contract types
// ---------------------------------------------------------------------------

enum class MotfJobStatus {
    pending, preparing, running, exporting, completed, failed, cancelled
}

enum class MotfStage {
    import, probe, decode, preprocess, model_load, inference, postprocess, encode, finalize
}

enum class MotfOutputFormat { wav, m4a, flac }

enum class MotfQualityPreset { fast, balanced, high }

data class MotfStemArtifact(
    val name: String,
    val label: String,
    val uri: String,
    val mimeType: String,
    val durationSeconds: Double? = null,
    val sampleRate: Int? = null,
    val channels: Int? = null,
    val sizeBytes: Long? = null,
)

data class MotfEngineError(
    val code: String,
    val message: String,
    val recoverable: Boolean,
    val details: Map<String, String>? = null,
)

data class MotfSeparationOptions(
    val outputFormat: MotfOutputFormat? = null,
    val sampleRate: Int? = null,
    val quality: MotfQualityPreset? = null,
    val chunkSeconds: Double? = null,
    val overlapSeconds: Double? = null,
    val modelId: String? = null,
)

data class MotfSeparationRequest(
    val jobId: String? = null,
    val inputUri: String,
    val mode: String,
    val outputDir: String,
    val displayName: String? = null,
    val options: MotfSeparationOptions? = null,
)

data class MotfJob(
    val id: String,
    val inputUri: String,
    val displayName: String,
    val mode: String,
    val status: MotfJobStatus,
    val progress: Double,
    val stage: MotfStage? = null,
    val stageProgress: Double? = null,
    val message: String? = null,
    val createdAt: String,
    val updatedAt: String,
    val startedAt: String? = null,
    val completedAt: String? = null,
    val outputDir: String,
    val stems: List<MotfStemArtifact> = emptyList(),
    val error: MotfEngineError? = null,
    val warnings: List<String> = emptyList(),
)

data class MotfModeCapability(
    val id: String,
    val label: String,
    val description: String,
    val expectedStems: List<String>,
    val available: Boolean,
    val unavailableReason: String? = null,
    val modelIds: List<String>? = null,
)

data class MotfEngineCapabilities(
    val engineVersion: String,
    val platform: String = "android",
    val deviceModel: String? = null,
    val offline: Boolean = true,
    val runtimes: List<String> = emptyList(),
    val accelerators: List<String> = emptyList(),
    val modes: List<MotfModeCapability> = emptyList(),
    val maxInputMinutes: Int? = null,
    val maxFileSizeBytes: Long? = null,
)

data class MotfPrepareResult(
    val ok: Boolean,
    val modelId: String? = null,
    val warnings: List<String> = emptyList(),
    val error: MotfEngineError? = null,
)

data class MotfCancelResult(
    val ok: Boolean,
    val jobId: String,
    val status: MotfJobStatus,
    val error: MotfEngineError? = null,
)

data class MotfJobEvent(
    val type: String, // job_updated | job_completed | job_failed | job_cancelled
    val job: MotfJob,
)

// ---------------------------------------------------------------------------
// Event callback / bridge shape
// ---------------------------------------------------------------------------

/**
 * Native-to-JS event listener shape. Bridge modules should forward these events
 * over the platform event emitter (Expo Modules / RN DeviceEventEmitter).
 */
fun interface MotfJobEventListener {
    fun onEvent(event: MotfJobEvent)
}

interface MotfEventEmitting {
    fun addJobEventListener(listener: MotfJobEventListener): String
    fun removeJobEventListener(token: String)
}

// ---------------------------------------------------------------------------
// Model manifest (aligned with mobile/engine/manifest.schema.json)
// ---------------------------------------------------------------------------

data class MotfModelManifestFile(
    val path: String,
    val sha256: String,
    val sizeBytes: Long? = null,
)

data class MotfModelManifestInput(
    val sampleRate: Int,
    val channels: Int,
    val format: String,
)

data class MotfModelManifestOutput(
    val stems: List<String>,
)

data class MotfModelManifest(
    val modelId: String,
    val mode: String,
    val version: String,
    val runtime: String,
    val files: List<MotfModelManifestFile>,
    val input: MotfModelManifestInput,
    val output: MotfModelManifestOutput,
    val notes: String? = null,
)

// ---------------------------------------------------------------------------
// Engine protocol
// ---------------------------------------------------------------------------

interface MotfEngine {
    suspend fun getCapabilities(): MotfEngineCapabilities
    suspend fun prepare(mode: String, options: MotfSeparationOptions? = null): MotfPrepareResult
    suspend fun startJob(request: MotfSeparationRequest): MotfJob
    suspend fun getJob(jobId: String): MotfJob?
    suspend fun listJobs(): List<MotfJob>
    suspend fun cancelJob(jobId: String): MotfCancelResult
    suspend fun deleteJob(jobId: String, deleteOutputFiles: Boolean = false)
}

// ---------------------------------------------------------------------------
// ONNX stub implementation
// ---------------------------------------------------------------------------

/**
 * Concrete ONNX Runtime Mobile-oriented stub.
 *
 * TODO(android-engine): wire ONNX Runtime Mobile session creation, tensor IO, and
 * execution provider selection (NNAPI/GPU/CPU based on device capability).
 */
class MotfOnnxEngine : MotfEngine, MotfEventEmitting {

    // In-memory job store. TODO(persistence): back with file/Room/SQLite store so
    // jobs survive process death and can be reconciled on launch.
    private val jobs = ConcurrentHashMap<String, MotfJob>()

    /** Cooperative cancellation flags checked between pipeline stages/chunks. */
    private val cancellationFlags = ConcurrentHashMap<String, Boolean>()

    private val eventListeners = ConcurrentHashMap<String, MotfJobEventListener>()

    /** Loaded/validated manifests keyed by modelId. */
    private val manifests = ConcurrentHashMap<String, MotfModelManifest>()

    // ---------------------------------------------------------------------
    // Capabilities / preparation
    // ---------------------------------------------------------------------

    override suspend fun getCapabilities(): MotfEngineCapabilities {
        // TODO(capabilities): inspect device RAM/thermal state, installed model manifests,
        // and ONNX Runtime EP availability before reporting modes as available.
        return MotfEngineCapabilities(
            engineVersion = "0.1.0-android-stub",
            platform = "android",
            deviceModel = null, // TODO(device): read Build.MODEL / Build.DEVICE.
            offline = true,
            runtimes = listOf("onnxruntime-mobile"),
            accelerators = listOf("cpu"), // TODO(accelerators): report nnapi/gpu when EP is enabled.
            modes = emptyList(),
            maxInputMinutes = null,
            maxFileSizeBytes = null,
        )
    }

    override suspend fun prepare(mode: String, options: MotfSeparationOptions?): MotfPrepareResult {
        // TODO(prepare): resolve mode -> model manifest, verify checksums,
        // pre-create ORT session, warm up buffers.
        val manifest = loadManifestForMode(mode, options?.modelId)
        verifyManifestChecksums(manifest)
        return MotfPrepareResult(
            ok = true,
            modelId = manifest.modelId,
            warnings = listOf("prepare is stubbed; no ONNX session created"),
        )
    }

    // ---------------------------------------------------------------------
    // Job lifecycle
    // ---------------------------------------------------------------------

    override suspend fun startJob(request: MotfSeparationRequest): MotfJob {
        validateRequest(request)

        val now = isoNow()
        val jobId = request.jobId ?: UUID.randomUUID().toString()
        val job = MotfJob(
            id = jobId,
            inputUri = request.inputUri,
            displayName = request.displayName ?: File(request.inputUri).name,
            mode = request.mode,
            status = MotfJobStatus.pending,
            progress = 0.0,
            stage = null,
            stageProgress = null,
            message = "Job queued",
            createdAt = now,
            updatedAt = now,
            startedAt = null,
            completedAt = null,
            outputDir = request.outputDir,
            stems = emptyList(),
            error = null,
            warnings = emptyList(),
        )

        jobs[jobId] = job
        cancellationFlags[jobId] = false
        emit(MotfJobEvent(type = "job_updated", job = job))

        // TODO(execution): dispatch to a background coroutine/WorkManager/executor with
        // resource limits. Keep UI responsive; avoid concurrent heavy jobs unless budget allows.
        Thread { runPipeline(jobId, request) }.start()

        return job
    }

    override suspend fun getJob(jobId: String): MotfJob? = jobs[jobId]

    override suspend fun listJobs(): List<MotfJob> =
        jobs.values.sortedByDescending { it.createdAt }

    override suspend fun cancelJob(jobId: String): MotfCancelResult {
        cancellationFlags[jobId] = true
        val existing = jobs[jobId]
            ?: return MotfCancelResult(
                ok = false,
                jobId = jobId,
                status = MotfJobStatus.failed,
                error = MotfEngineError(code = "JOB_NOT_FOUND", message = "Job not found", recoverable = false),
            )

        // Cooperative cancellation: running pipeline checks this flag between stages/chunks.
        if (existing.status in setOf(MotfJobStatus.pending, MotfJobStatus.preparing, MotfJobStatus.running, MotfJobStatus.exporting)) {
            val cancelled = existing.copy(
                status = MotfJobStatus.cancelled,
                message = "Cancellation requested",
                updatedAt = isoNow(),
            )
            jobs[jobId] = cancelled
            emit(MotfJobEvent(type = "job_cancelled", job = cancelled))
            return MotfCancelResult(ok = true, jobId = jobId, status = MotfJobStatus.cancelled)
        }

        return MotfCancelResult(ok = true, jobId = jobId, status = existing.status)
    }

    override suspend fun deleteJob(jobId: String, deleteOutputFiles: Boolean) {
        // TODO(delete): if deleteOutputFiles, remove outputDir/stem files owned by job.
        // TODO(delete): persist deletion in job store.
        jobs.remove(jobId)
        cancellationFlags.remove(jobId)
    }

    // ---------------------------------------------------------------------
    // Event listeners
    // ---------------------------------------------------------------------

    override fun addJobEventListener(listener: MotfJobEventListener): String {
        val token = UUID.randomUUID().toString()
        eventListeners[token] = listener
        return token
    }

    override fun removeJobEventListener(token: String) {
        eventListeners.remove(token)
    }

    private fun emit(event: MotfJobEvent) {
        for (listener in eventListeners.values) {
            listener.onEvent(event)
        }
    }

    // ---------------------------------------------------------------------
    // Pipeline (stubbed)
    // ---------------------------------------------------------------------

    private fun runPipeline(jobId: String, request: MotfSeparationRequest) {
        try {
            // Audio pipeline stages (see shared/pipeline.md):
            // 1. import/probe - validate URI, inspect container, duration, channels, sample rate.
            transition(jobId, MotfJobStatus.preparing, MotfStage.probe, 0.05, 0.0, "Probing input")
            throwIfCancelled(jobId)

            // 2. decode - decode compressed audio to PCM float buffers.
            transition(jobId, MotfJobStatus.preparing, MotfStage.decode, 0.10, 0.0, "Decoding audio")
            // TODO(decode): use MediaCodec/MediaExtractor to decode to PCM f32.
            throwIfCancelled(jobId)

            // 3. preprocess - resample, channel normalize, chunk/window planning.
            transition(jobId, MotfJobStatus.preparing, MotfStage.preprocess, 0.15, 0.0, "Preprocessing audio")
            // TODO(preprocess): resample to manifest.input.sampleRate, normalize channels.
            throwIfCancelled(jobId)

            // 4. model_load - load manifest, verify checksums, create ONNX session.
            transition(jobId, MotfJobStatus.preparing, MotfStage.model_load, 0.20, 0.0, "Loading model")
            val manifest = loadManifestForMode(request.mode, request.options?.modelId)
            verifyManifestChecksums(manifest)
            // TODO(model): OrtEnvironment + OrtSession with NNAPI/GPU/CPU EP options.
            throwIfCancelled(jobId)

            // 5. inference - run chunked inference; emit progress per chunk.
            transition(jobId, MotfJobStatus.running, MotfStage.inference, 0.25, 0.0, "Running inference")
            // TODO(inference): for each chunk { preprocess tensor; session.run; collect stem tensors; check cancellation }.
            throwIfCancelled(jobId)

            // 6. postprocess - overlap-add, clamp/denormalize, stem alignment.
            transition(jobId, MotfJobStatus.running, MotfStage.postprocess, 0.80, 0.0, "Postprocessing stems")
            // TODO(postprocess): overlap-add chunks, avoid clicks, preserve duration.
            throwIfCancelled(jobId)

            // 7. encode - write stem files (WAV/M4A/FLAC) to outputDir.
            transition(jobId, MotfJobStatus.exporting, MotfStage.encode, 0.90, 0.0, "Encoding stems")
            // TODO(encode): write artifacts with stable names from manifest.output.stems.
            throwIfCancelled(jobId)

            // 8. finalize - register artifacts, cleanup temp files.
            val stems = manifest.output.stems.map { name ->
                MotfStemArtifact(
                    name = name,
                    label = name.replace('_', ' ').replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() },
                    uri = request.outputDir.trimEnd('/') + "/" + name + ".wav",
                    mimeType = "audio/wav",
                )
            }
            val existing = jobs[jobId]
            if (existing != null) {
                val completed = existing.copy(
                    status = MotfJobStatus.completed,
                    progress = 1.0,
                    stage = MotfStage.finalize,
                    stageProgress = 1.0,
                    message = "Completed",
                    updatedAt = isoNow(),
                    startedAt = existing.startedAt ?: existing.createdAt,
                    completedAt = isoNow(),
                    stems = stems,
                    error = null,
                    warnings = existing.warnings + "Stub engine: no real inference performed",
                )
                jobs[jobId] = completed
                emit(MotfJobEvent(type = "job_completed", job = completed))
            }
        } catch (e: CancellationRequested) {
            markCancelled(jobId)
        } catch (e: EngineRuntimeException) {
            markFailed(jobId, e.error)
        } catch (e: Throwable) {
            markFailed(jobId, MotfEngineError(code = "INTERNAL_ERROR", message = e.message ?: "Unknown error", recoverable = false))
        }
    }

    // ---------------------------------------------------------------------
    // Manifest loading / checksum placeholder
    // ---------------------------------------------------------------------

    private fun loadManifestForMode(mode: String, modelId: String?): MotfModelManifest {
        // TODO(manifest): load from app assets or downloaded model directory.
        // TODO(manifest): select by explicit modelId or default model for mode.
        // TODO(manifest): parse JSON and validate against manifest.schema.json.
        if (modelId != null) manifests[modelId]?.let { return it }

        // Stub manifest for scaffolding; real implementation must load real manifest.
        val stub = MotfModelManifest(
            modelId = modelId ?: "stub-$mode-v1",
            mode = mode,
            version = "0.0.0-stub",
            runtime = "onnxruntime",
            files = listOf(
                MotfModelManifestFile(
                    path = "models/onnx/stub.onnx",
                    sha256 = "0".repeat(64),
                    sizeBytes = null,
                )
            ),
            input = MotfModelManifestInput(sampleRate = 44100, channels = 2, format = "float32"),
            output = MotfModelManifestOutput(stems = listOf("vocals", "instrumental")),
            notes = "Stub manifest - replace with real model manifest loading",
        )
        manifests[stub.modelId] = stub
        return stub
    }

    private fun verifyManifestChecksums(manifest: MotfModelManifest) {
        // TODO(checksum): for each file, compute SHA-256 and compare to manifest.files[].sha256.
        // TODO(checksum): stream file through MessageDigest.getInstance("SHA-256");
        // fail with MODEL_CHECKSUM_MISMATCH.
        // TODO(checksum): verify file exists and optional sizeBytes before loading model.
    }

    // ---------------------------------------------------------------------
    // Validation / helpers
    // ---------------------------------------------------------------------

    private fun validateRequest(request: MotfSeparationRequest) {
        if (request.inputUri.startsWith("http://") || request.inputUri.startsWith("https://")) {
            throw EngineRuntimeException(
                MotfEngineError(
                    code = "INVALID_INPUT",
                    message = "Remote URLs are not supported; input must be a local file",
                    recoverable = false,
                )
            )
        }
        if (request.mode.trim().isEmpty()) {
            throw EngineRuntimeException(
                MotfEngineError(code = "INVALID_REQUEST", message = "mode is required", recoverable = false)
            )
        }
        // TODO(validate): verify file exists/readable, probe format, enforce max duration/size.
    }

    private fun transition(
        jobId: String,
        status: MotfJobStatus,
        stage: MotfStage,
        progress: Double,
        stageProgress: Double,
        message: String,
        stems: List<MotfStemArtifact> = emptyList(),
    ) {
        throwIfCancelled(jobId)
        val existing = jobs[jobId] ?: return
        val updated = existing.copy(
            status = status,
            progress = progress,
            stage = stage,
            stageProgress = stageProgress,
            message = message,
            updatedAt = isoNow(),
            startedAt = existing.startedAt ?: isoNow(),
            stems = stems,
        )
        jobs[jobId] = updated
        emit(MotfJobEvent(type = "job_updated", job = updated))
    }

    private fun markFailed(jobId: String, error: MotfEngineError) {
        val existing = jobs[jobId] ?: return
        val failed = existing.copy(
            status = MotfJobStatus.failed,
            message = error.message,
            updatedAt = isoNow(),
            completedAt = isoNow(),
            error = error,
        )
        jobs[jobId] = failed
        emit(MotfJobEvent(type = "job_failed", job = failed))
    }

    private fun markCancelled(jobId: String) {
        val existing = jobs[jobId] ?: return
        val cancelled = existing.copy(
            status = MotfJobStatus.cancelled,
            message = "Cancelled",
            updatedAt = isoNow(),
            completedAt = isoNow(),
            error = null,
        )
        jobs[jobId] = cancelled
        emit(MotfJobEvent(type = "job_cancelled", job = cancelled))
    }

    private fun throwIfCancelled(jobId: String) {
        if (cancellationFlags[jobId] == true) throw CancellationRequested()
    }

    private fun isoNow(): String = Instant.now().toString()
}

private class CancellationRequested : RuntimeException("Job cancellation requested")

private class EngineRuntimeException(val error: MotfEngineError) : RuntimeException(error.message)
