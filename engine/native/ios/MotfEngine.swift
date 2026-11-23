import Foundation

/// MOTF Mobile native engine contract + ONNX Runtime Mobile stub (iOS).
///
/// Status: scaffold/stub. Methods are compile-shaped but not fully implemented.
/// Real inference should be wired behind `MotfOnnxEngine` using ONNX Runtime Mobile
/// (or a Core ML backend behind the same protocol) without changing the JS bridge contract.
///
/// Keep aligned with:
/// - mobile/engine/contract.ts
/// - mobile/docs/ENGINE.md
/// - mobile/engine/native/BRIDGE.md

// MARK: - Contract types

public enum MotfJobStatus: String, Codable {
    case pending
    case preparing
    case running
    case exporting
    case completed
    case failed
    case cancelled
}

public enum MotfStage: String, Codable {
    case importStage = "import"
    case probe
    case decode
    case preprocess
    case modelLoad = "model_load"
    case inference
    case postprocess
    case encode
    case finalize
}

public enum MotfOutputFormat: String, Codable {
    case wav
    case m4a
    case flac
}

public enum MotfQualityPreset: String, Codable {
    case fast
    case balanced
    case high
}

public struct MotfStemArtifact: Codable {
    public let name: String
    public let label: String
    public let uri: String
    public let mimeType: String
    public let durationSeconds: Double?
    public let sampleRate: Int?
    public let channels: Int?
    public let sizeBytes: Int64?

    public init(
        name: String,
        label: String,
        uri: String,
        mimeType: String,
        durationSeconds: Double? = nil,
        sampleRate: Int? = nil,
        channels: Int? = nil,
        sizeBytes: Int64? = nil
    ) {
        self.name = name
        self.label = label
        self.uri = uri
        self.mimeType = mimeType
        self.durationSeconds = durationSeconds
        self.sampleRate = sampleRate
        self.channels = channels
        self.sizeBytes = sizeBytes
    }
}

public struct MotfEngineError: Codable {
    public let code: String
    public let message: String
    public let recoverable: Bool
    public let details: [String: String]?

    public init(code: String, message: String, recoverable: Bool, details: [String: String]? = nil) {
        self.code = code
        self.message = message
        self.recoverable = recoverable
        self.details = details
    }
}

public struct MotfSeparationOptions: Codable {
    public let outputFormat: MotfOutputFormat?
    public let sampleRate: Int?
    public let quality: MotfQualityPreset?
    public let chunkSeconds: Double?
    public let overlapSeconds: Double?
    public let modelId: String?

    public init(
        outputFormat: MotfOutputFormat? = nil,
        sampleRate: Int? = nil,
        quality: MotfQualityPreset? = nil,
        chunkSeconds: Double? = nil,
        overlapSeconds: Double? = nil,
        modelId: String? = nil
    ) {
        self.outputFormat = outputFormat
        self.sampleRate = sampleRate
        self.quality = quality
        self.chunkSeconds = chunkSeconds
        self.overlapSeconds = overlapSeconds
        self.modelId = modelId
    }
}

public struct MotfSeparationRequest: Codable {
    public let jobId: String?
    public let inputUri: String
    public let mode: String
    public let outputDir: String
    public let displayName: String?
    public let options: MotfSeparationOptions?

    public init(
        jobId: String? = nil,
        inputUri: String,
        mode: String,
        outputDir: String,
        displayName: String? = nil,
        options: MotfSeparationOptions? = nil
    ) {
        self.jobId = jobId
        self.inputUri = inputUri
        self.mode = mode
        self.outputDir = outputDir
        self.displayName = displayName
        self.options = options
    }
}

public struct MotfJob: Codable {
    public let id: String
    public let inputUri: String
    public let displayName: String
    public let mode: String
    public let status: MotfJobStatus
    public let progress: Double
    public let stage: MotfStage?
    public let stageProgress: Double?
    public let message: String?
    public let createdAt: String
    public let updatedAt: String
    public let startedAt: String?
    public let completedAt: String?
    public let outputDir: String
    public let stems: [MotfStemArtifact]
    public let error: MotfEngineError?
    public let warnings: [String]

    public init(
        id: String,
        inputUri: String,
        displayName: String,
        mode: String,
        status: MotfJobStatus,
        progress: Double,
        stage: MotfStage? = nil,
        stageProgress: Double? = nil,
        message: String? = nil,
        createdAt: String,
        updatedAt: String,
        startedAt: String? = nil,
        completedAt: String? = nil,
        outputDir: String,
        stems: [MotfStemArtifact] = [],
        error: MotfEngineError? = nil,
        warnings: [String] = []
    ) {
        self.id = id
        self.inputUri = inputUri
        self.displayName = displayName
        self.mode = mode
        self.status = status
        self.progress = progress
        self.stage = stage
        self.stageProgress = stageProgress
        self.message = message
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.startedAt = startedAt
        self.completedAt = completedAt
        self.outputDir = outputDir
        self.stems = stems
        self.error = error
        self.warnings = warnings
    }
}

public struct MotfModeCapability: Codable {
    public let id: String
    public let label: String
    public let description: String
    public let expectedStems: [String]
    public let available: Bool
    public let unavailableReason: String?
    public let modelIds: [String]?
}

public struct MotfEngineCapabilities: Codable {
    public let engineVersion: String
    public let platform: String
    public let deviceModel: String?
    public let offline: Bool
    public let runtimes: [String]
    public let accelerators: [String]
    public let modes: [MotfModeCapability]
    public let maxInputMinutes: Int?
    public let maxFileSizeBytes: Int64?
}

public struct MotfPrepareResult: Codable {
    public let ok: Bool
    public let modelId: String?
    public let warnings: [String]
    public let error: MotfEngineError?
}

public struct MotfCancelResult: Codable {
    public let ok: Bool
    public let jobId: String
    public let status: MotfJobStatus
    public let error: MotfEngineError?
}

public struct MotfJobEvent: Codable {
    public let type: String // job_updated | job_completed | job_failed | job_cancelled
    public let job: MotfJob
}

// MARK: - Event callback / bridge shape

/// Native-to-JS event listener shape. Bridge modules should forward these events
/// over the platform event emitter (Expo Modules / RN NativeEventEmitter).
public typealias MotfJobEventListener = (_ event: MotfJobEvent) -> Void

public protocol MotfEventEmitting {
    func addJobEventListener(_ listener: @escaping MotfJobEventListener) -> UUID
    func removeJobEventListener(_ token: UUID)
}

// MARK: - Model manifest (aligned with mobile/engine/manifest.schema.json)

public struct MotfModelManifestFile: Codable {
    public let path: String
    public let sha256: String
    public let sizeBytes: Int64?
}

public struct MotfModelManifestInput: Codable {
    public let sampleRate: Int
    public let channels: Int
    public let format: String
}

public struct MotfModelManifestOutput: Codable {
    public let stems: [String]
}

public struct MotfModelManifest: Codable {
    public let modelId: String
    public let mode: String
    public let version: String
    public let runtime: String
    public let files: [MotfModelManifestFile]
    public let input: MotfModelManifestInput
    public let output: MotfModelManifestOutput
    public let notes: String?
}

// MARK: - Engine protocol

public protocol MotfEngine {
    func getCapabilities() async throws -> MotfEngineCapabilities
    func prepare(mode: String, options: MotfSeparationOptions?) async throws -> MotfPrepareResult
    func startJob(_ request: MotfSeparationRequest) async throws -> MotfJob
    func getJob(_ jobId: String) async throws -> MotfJob?
    func listJobs() async throws -> [MotfJob]
    func cancelJob(_ jobId: String) async throws -> MotfCancelResult
    func deleteJob(_ jobId: String, deleteOutputFiles: Bool) async throws
}

// MARK: - ONNX stub implementation

/// Concrete ONNX Runtime Mobile-oriented stub.
///
/// TODO(ios-engine): wire ONNX Runtime Mobile session creation, tensor IO, and
/// execution provider selection (Core ML EP where available, CPU fallback).
public final class MotfOnnxEngine: MotfEngine, MotfEventEmitting {

    // MARK: - Job store

    /// In-memory job store. TODO(persistence): back with file/SQLite store so jobs
    /// survive app restarts and can be reconciled on launch.
    private var jobs: [String: MotfJob] = [:]
    private let jobsLock = NSLock()

    /// Cooperative cancellation flags checked between pipeline stages/chunks.
    private var cancellationFlags: [String: Bool] = [:]

    private var eventListeners: [UUID: MotfJobEventListener] = [:]
    private let listenersLock = NSLock()

    /// Loaded/validated manifests keyed by modelId.
    private var manifests: [String: MotfModelManifest] = [:]

    public init() {}

    // MARK: - Capabilities / preparation

    public func getCapabilities() async throws -> MotfEngineCapabilities {
        // TODO(capabilities): inspect device RAM/thermal state, installed model manifests,
        // and ONNX Runtime EP availability before reporting modes as available.
        return MotfEngineCapabilities(
            engineVersion: "0.1.0-ios-stub",
            platform: "ios",
            deviceModel: nil, // TODO(device): map ProcessInfo/utsname to device model.
            offline: true,
            runtimes: ["onnxruntime-mobile"],
            accelerators: ["cpu"], // TODO(accelerators): report coreml/neuralengine when EP is enabled.
            modes: [],
            maxInputMinutes: nil,
            maxFileSizeBytes: nil
        )
    }

    public func prepare(mode: String, options: MotfSeparationOptions?) async throws -> MotfPrepareResult {
        // TODO(prepare): resolve mode -> model manifest, download/install check if bundled,
        // verify checksums, pre-create ONNX session, warm up buffers.
        let manifest = try loadManifest(forMode: mode, modelId: options?.modelId)
        try verifyManifestChecksums(manifest)
        return MotfPrepareResult(ok: true, modelId: manifest.modelId, warnings: ["prepare is stubbed; no ONNX session created"], error: nil)
    }

    // MARK: - Job lifecycle

    public func startJob(_ request: MotfSeparationRequest) async throws -> MotfJob {
        try validateRequest(request)

        let now = isoNow()
        let jobId = request.jobId ?? UUID().uuidString
        let job = MotfJob(
            id: jobId,
            inputUri: request.inputUri,
            displayName: request.displayName ?? URL(fileURLWithPath: request.inputUri).lastPathComponent,
            mode: request.mode,
            status: .pending,
            progress: 0,
            stage: nil,
            stageProgress: nil,
            message: "Job queued",
            createdAt: now,
            updatedAt: now,
            startedAt: nil,
            completedAt: nil,
            outputDir: request.outputDir,
            stems: [],
            error: nil,
            warnings: []
        )

        storeJob(job)
        setCancellation(jobId: jobId, cancelled: false)
        emit(type: "job_updated", job: job)

        // TODO(execution): dispatch to a background queue/actor with resource limits.
        // The real implementation must keep UI responsive and avoid concurrent heavy jobs
        // unless device budget allows it.
        Task.detached { [weak self] in
            await self?.runPipeline(jobId: jobId, request: request)
        }

        return job
    }

    public func getJob(_ jobId: String) async throws -> MotfJob? {
        jobsLock.lock()
        defer { jobsLock.unlock() }
        return jobs[jobId]
    }

    public func listJobs() async throws -> [MotfJob] {
        jobsLock.lock()
        defer { jobsLock.unlock() }
        return jobs.values.sorted { $0.createdAt > $1.createdAt }
    }

    public func cancelJob(_ jobId: String) async throws -> MotfCancelResult {
        setCancellation(jobId: jobId, cancelled: true)
        guard var job = try await getJob(jobId) else {
            return MotfCancelResult(
                ok: false,
                jobId: jobId,
                status: .failed,
                error: MotfEngineError(code: "JOB_NOT_FOUND", message: "Job not found", recoverable: false)
            )
        }

        // Cooperative cancellation: running pipeline checks this flag between stages/chunks.
        if job.status == .pending || job.status == .preparing || job.status == .running || job.status == .exporting {
            job = update(job, status: .cancelled, progress: job.progress, stage: job.stage, stageProgress: job.stageProgress, message: "Cancellation requested")
            emit(type: "job_cancelled", job: job)
        }

        return MotfCancelResult(ok: true, jobId: jobId, status: job.status, error: nil)
    }

    public func deleteJob(_ jobId: String, deleteOutputFiles: Bool) async throws {
        // TODO(delete): if deleteOutputFiles, remove outputDir/stem files owned by job.
        // TODO(delete): persist deletion in job store.
        jobsLock.lock()
        jobs.removeValue(forKey: jobId)
        cancellationFlags.removeValue(forKey: jobId)
        jobsLock.unlock()
    }

    // MARK: - Event listeners

    public func addJobEventListener(_ listener: @escaping MotfJobEventListener) -> UUID {
        let token = UUID()
        listenersLock.lock()
        eventListeners[token] = listener
        listenersLock.unlock()
        return token
    }

    public func removeJobEventListener(_ token: UUID) {
        listenersLock.lock()
        eventListeners.removeValue(forKey: token)
        listenersLock.unlock()
    }

    private func emit(type: String, job: MotfJob) {
        let event = MotfJobEvent(type: type, job: job)
        listenersLock.lock()
        let listeners = Array(eventListeners.values)
        listenersLock.unlock()
        for listener in listeners {
            listener(event)
        }
    }

    // MARK: - Pipeline (stubbed)

    private func runPipeline(jobId: String, request: MotfSeparationRequest) async {
        do {
            // Audio pipeline stages (see shared/pipeline.md):
            // 1. import/probe - validate URI, inspect container, duration, channels, sample rate.
            try await transition(jobId: jobId, status: .preparing, stage: .probe, progress: 0.05, stageProgress: 0.0, message: "Probing input")
            try throwIfCancelled(jobId)

            // 2. decode - decode compressed audio to PCM float buffers.
            try await transition(jobId: jobId, status: .preparing, stage: .decode, progress: 0.10, stageProgress: 0.0, message: "Decoding audio")
            // TODO(decode): use AVFoundation/AudioToolbox to decode to PCM f32.
            try throwIfCancelled(jobId)

            // 3. preprocess - resample, channel normalize, chunk/window planning.
            try await transition(jobId: jobId, status: .preparing, stage: .preprocess, progress: 0.15, stageProgress: 0.0, message: "Preprocessing audio")
            // TODO(preprocess): resample to manifest.input.sampleRate, normalize channels.
            try throwIfCancelled(jobId)

            // 4. model_load - load manifest, verify checksums, create ONNX session.
            try await transition(jobId: jobId, status: .preparing, stage: .modelLoad, progress: 0.20, stageProgress: 0.0, message: "Loading model")
            let manifest = try loadManifest(forMode: request.mode, modelId: request.options?.modelId)
            try verifyManifestChecksums(manifest)
            // TODO(model): ORTSession.create(...) with model path and EP options.
            try throwIfCancelled(jobId)

            // 5. inference - run chunked inference; emit progress per chunk.
            try await transition(jobId: jobId, status: .running, stage: .inference, progress: 0.25, stageProgress: 0.0, message: "Running inference")
            // TODO(inference): for each chunk { preprocess tensor; session.run; collect stem tensors; check cancellation }.
            try throwIfCancelled(jobId)

            // 6. postprocess - overlap-add, clamp/denormalize, stem alignment.
            try await transition(jobId: jobId, status: .running, stage: .postprocess, progress: 0.80, stageProgress: 0.0, message: "Postprocessing stems")
            // TODO(postprocess): overlap-add chunks, avoid clicks, preserve duration.
            try throwIfCancelled(jobId)

            // 7. encode - write stem files (WAV/M4A/FLAC) to outputDir.
            try await transition(jobId: jobId, status: .exporting, stage: .encode, progress: 0.90, stageProgress: 0.0, message: "Encoding stems")
            // TODO(encode): write artifacts with stable names from manifest.output.stems.
            try throwIfCancelled(jobId)

            // 8. finalize - register artifacts, cleanup temp files.
            let stems = manifest.output.stems.map { name in
                MotfStemArtifact(
                    name: name,
                    label: name.replacingOccurrences(of: "_", with: " ").capitalized,
                    uri: request.outputDir + "/" + name + ".wav",
                    mimeType: "audio/wav"
                )
            }
            try await transition(jobId: jobId, status: .completed, stage: .finalize, progress: 1.0, stageProgress: 1.0, message: "Completed", stems: stems)
            if var job = try await getJob(jobId) {
                job = MotfJob(
                    id: job.id, inputUri: job.inputUri, displayName: job.displayName, mode: job.mode,
                    status: .completed, progress: 1.0, stage: .finalize, stageProgress: 1.0,
                    message: "Completed", createdAt: job.createdAt, updatedAt: isoNow(),
                    startedAt: job.startedAt ?? job.createdAt, completedAt: isoNow(),
                    outputDir: job.outputDir, stems: stems, error: nil, warnings: ["Stub engine: no real inference performed"]
                )
                storeJob(job)
                emit(type: "job_completed", job: job)
            }
        } catch is CancellationError {
            await markCancelled(jobId: jobId)
        } catch let engineError as MotfEngineRuntimeError {
            await markFailed(jobId: jobId, error: engineError.error)
        } catch {
            await markFailed(jobId: jobId, error: MotfEngineError(code: "INTERNAL_ERROR", message: error.localizedDescription, recoverable: false))
        }
    }

    // MARK: - Manifest loading / checksum placeholder

    private func loadManifest(forMode mode: String, modelId: String?) throws -> MotfModelManifest {
        // TODO(manifest): load from app bundle or downloaded model directory.
        // TODO(manifest): select by explicit modelId or default model for mode.
        // TODO(manifest): parse JSON and validate against manifest.schema.json.
        if let modelId, let cached = manifests[modelId] { return cached }

        // Stub manifest for scaffolding; real implementation must load real manifest.
        let stub = MotfModelManifest(
            modelId: modelId ?? "stub-\(mode)-v1",
            mode: mode,
            version: "0.0.0-stub",
            runtime: "onnxruntime",
            files: [MotfModelManifestFile(path: "models/onnx/stub.onnx", sha256: String(repeating: "0", count: 64), sizeBytes: nil)],
            input: MotfModelManifestInput(sampleRate: 44100, channels: 2, format: "float32"),
            output: MotfModelManifestOutput(stems: ["vocals", "instrumental"]),
            notes: "Stub manifest - replace with real model manifest loading"
        )
        manifests[stub.modelId] = stub
        return stub
    }

    private func verifyManifestChecksums(_ manifest: MotfModelManifest) throws {
        // TODO(checksum): for each file, compute SHA-256 and compare to manifest.files[].sha256.
        // TODO(checksum): use CryptoKit SHA256 on file stream; fail with MODEL_CHECKSUM_MISMATCH.
        // TODO(checksum): verify file exists and optional sizeBytes before loading model.
        _ = manifest
    }

    // MARK: - Validation / helpers

    private func validateRequest(_ request: MotfSeparationRequest) throws {
        if request.inputUri.hasPrefix("http://") || request.inputUri.hasPrefix("https://") {
            throw MotfEngineRuntimeError(error: MotfEngineError(code: "INVALID_INPUT", message: "Remote URLs are not supported; input must be a local file", recoverable: false))
        }
        if request.mode.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            throw MotfEngineRuntimeError(error: MotfEngineError(code: "INVALID_REQUEST", message: "mode is required", recoverable: false))
        }
        // TODO(validate): verify file exists/readable, probe format, enforce max duration/size.
    }

    private func transition(jobId: String, status: MotfJobStatus, stage: MotfStage, progress: Double, stageProgress: Double, message: String, stems: [MotfStemArtifact] = []) async throws {
        try throwIfCancelled(jobId)
        guard let existing = try await getJob(jobId) else { return }
        let updated = MotfJob(
            id: existing.id, inputUri: existing.inputUri, displayName: existing.displayName, mode: existing.mode,
            status: status, progress: progress, stage: stage, stageProgress: stageProgress, message: message,
            createdAt: existing.createdAt, updatedAt: isoNow(),
            startedAt: existing.startedAt ?? isoNow(), completedAt: nil,
            outputDir: existing.outputDir, stems: stems, error: nil, warnings: existing.warnings
        )
        storeJob(updated)
        emit(type: "job_updated", job: updated)
    }

    private func markFailed(jobId: String, error: MotfEngineError) async {
        guard let existing = try? await getJob(jobId) else { return }
        let failed = MotfJob(
            id: existing.id, inputUri: existing.inputUri, displayName: existing.displayName, mode: existing.mode,
            status: .failed, progress: existing.progress, stage: existing.stage, stageProgress: existing.stageProgress,
            message: error.message, createdAt: existing.createdAt, updatedAt: isoNow(),
            startedAt: existing.startedAt, completedAt: isoNow(),
            outputDir: existing.outputDir, stems: existing.stems, error: error, warnings: existing.warnings
        )
        storeJob(failed)
        emit(type: "job_failed", job: failed)
    }

    private func markCancelled(jobId: String) async {
        guard let existing = try? await getJob(jobId) else { return }
        let cancelled = MotfJob(
            id: existing.id, inputUri: existing.inputUri, displayName: existing.displayName, mode: existing.mode,
            status: .cancelled, progress: existing.progress, stage: existing.stage, stageProgress: existing.stageProgress,
            message: "Cancelled", createdAt: existing.createdAt, updatedAt: isoNow(),
            startedAt: existing.startedAt, completedAt: isoNow(),
            outputDir: existing.outputDir, stems: existing.stems, error: nil, warnings: existing.warnings
        )
        storeJob(cancelled)
        emit(type: "job_cancelled", job: cancelled)
    }

    private func storeJob(_ job: MotfJob) {
        jobsLock.lock()
        jobs[job.id] = job
        jobsLock.unlock()
    }

    private func setCancellation(jobId: String, cancelled: Bool) {
        jobsLock.lock()
        cancellationFlags[jobId] = cancelled
        jobsLock.unlock()
    }

    private func throwIfCancelled(_ jobId: String) throws {
        jobsLock.lock()
        let cancelled = cancellationFlags[jobId] == true
        jobsLock.unlock()
        if cancelled { throw CancellationError() }
    }

    private func isoNow() -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.string(from: Date())
    }
}

private struct MotfEngineRuntimeError: Error {
    let error: MotfEngineError
}
