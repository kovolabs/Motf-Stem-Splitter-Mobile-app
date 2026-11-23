/**
 * MOTF Mobile Separation Engine Contract
 *
 * This file defines the interface between the mobile app UI/application layer
 * and the on-device separation engine implementation.
 *
 * It is intentionally runtime-agnostic: implementations may use Core ML,
 * ONNX Runtime Mobile, LiteRT, or platform-specific hybrids.
 *
 * Status: draft scaffold - expected to evolve during Phase 0/1.
 */

export type JobStatus =
  | "pending"
  | "preparing"
  | "running"
  | "exporting"
  | "completed"
  | "failed"
  | "cancelled";

export type EngineStage =
  | "import"
  | "probe"
  | "decode"
  | "preprocess"
  | "model_load"
  | "inference"
  | "postprocess"
  | "encode"
  | "finalize";

export type OutputFormat = "wav" | "m4a" | "flac";
export type QualityPreset = "fast" | "balanced" | "high";

export interface EngineCapabilities {
  engineVersion: string;
  platform: "ios" | "android";
  deviceModel?: string;
  offline: true;
  runtimes: string[]; // e.g. ["coreml", "onnxruntime"]
  accelerators: string[]; // e.g. ["ane", "cpu", "nnapi", "gpu"]
  modes: ModeCapability[];
  maxInputMinutes?: number;
  maxFileSizeBytes?: number;
}

export interface ModeCapability {
  id: string; // stable id, e.g. "vocal_split"
  label: string;
  description: string;
  expectedStems: string[]; // stable stem names
  available: boolean;
  unavailableReason?: string;
  modelIds?: string[];
  estimatedSpeed?: "slow" | "medium" | "fast";
}

export interface SeparationRequest {
  jobId?: string;
  inputUri: string; // local file URI/path
  mode: string;
  outputDir: string; // app-managed output directory
  displayName?: string;
  options?: SeparationOptions;
}

export interface SeparationOptions {
  outputFormat?: OutputFormat;
  sampleRate?: 44100 | 48000;
  quality?: QualityPreset;
  chunkSeconds?: number;
  overlapSeconds?: number;
  modelId?: string;
}

export interface Job {
  id: string;
  inputUri: string;
  displayName: string;
  mode: string;
  status: JobStatus;
  progress: number; // 0..1
  stage?: EngineStage;
  stageProgress?: number; // 0..1
  message?: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  startedAt?: string;
  completedAt?: string;
  outputDir: string;
  stems: StemArtifact[];
  error?: EngineError;
  warnings?: string[];
}

export interface StemArtifact {
  name: string; // stable machine name, e.g. "lead_vocals"
  label: string; // UI label
  uri: string; // local file URI
  mimeType: string;
  durationSeconds?: number;
  sampleRate?: number;
  channels?: number;
  sizeBytes?: number;
}

export interface EngineError {
  code: string; // machine-readable, e.g. MODEL_NOT_FOUND
  message: string; // human-readable
  recoverable: boolean;
  details?: Record<string, unknown>;
}

export interface JobEvent {
  type: "job_updated" | "job_completed" | "job_failed" | "job_cancelled";
  job: Job;
}

export interface PrepareResult {
  ok: boolean;
  modelId?: string;
  warnings?: string[];
  error?: EngineError;
}

export interface CancelResult {
  ok: boolean;
  jobId: string;
  status: JobStatus;
  error?: EngineError;
}

export interface DeleteJobOptions {
  deleteOutputFiles?: boolean;
}

export interface SeparationEngine {
  getCapabilities(): Promise<EngineCapabilities>;
  prepare(mode: string, options?: SeparationOptions): Promise<PrepareResult>;
  startJob(request: SeparationRequest): Promise<Job>;
  getJob(jobId: string): Promise<Job | null>;
  listJobs(): Promise<Job[]>;
  cancelJob(jobId: string): Promise<CancelResult>;
  deleteJob(jobId: string, options?: DeleteJobOptions): Promise<void>;

  /**
   * Subscribe to job events. Returns an unsubscribe function.
   * Implementations may also provide platform-native streams/callbacks.
   */
  subscribe(jobId: string, onEvent: (event: JobEvent) => void): () => void;
}

/**
 * Suggested stable stem names. Engines may emit a subset depending on mode.
 * Keep names stable across platforms for UI/storage compatibility.
 */
export const STEM_NAMES = {
  drums: "drums",
  bass: "bass",
  vocals: "vocals",
  guitar: "guitar",
  piano: "piano",
  other: "other",
  kick: "kick",
  snare: "snare",
  hihat: "hihat",
  cymbals: "cymbals",
  toms: "toms",
  noDrums: "no_drums",
  leadVocals: "lead_vocals",
  backingVocals: "backing_vocals",
  instrumental: "instrumental",
} as const;