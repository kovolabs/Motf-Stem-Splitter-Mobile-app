/**
 * DEV-ONLY MOCK ENGINE
 *
 * This mock implements SeparationEngine for UI/scaffold development.
 * It simulates offline job progress and produces fake stem artifact paths.
 * It does NOT perform real audio separation.
 *
 * Replace via engineBridge.ts when the native engine is ready.
 */
import type {
  CancelResult,
  DeleteJobOptions,
  EngineCapabilities,
  EngineStage,
  Job,
  JobEvent,
  PrepareResult,
  SeparationEngine,
  SeparationOptions,
  SeparationRequest,
  StemArtifact,
} from '../../../engine/contract';
import type { ModelManager } from './modelManager';

const MOCK_STAGES: EngineStage[] = [
  'import',
  'probe',
  'decode',
  'preprocess',
  'model_load',
  'inference',
  'postprocess',
  'encode',
  'finalize',
];

const MODE_STEMS: Record<string, Array<{ name: string; label: string }>> = {
  vocal_instrumental: [
    { name: 'vocals', label: 'Vocals' },
    { name: 'instrumental', label: 'Instrumental' },
  ],
  vocal_split: [
    { name: 'lead_vocals', label: 'Lead Vocals' },
    { name: 'backing_vocals', label: 'Backing Vocals' },
    { name: 'instrumental', label: 'Instrumental' },
  ],
  full_stems: [
    { name: 'drums', label: 'Drums' },
    { name: 'bass', label: 'Bass' },
    { name: 'vocals', label: 'Vocals' },
    { name: 'guitar', label: 'Guitar' },
    { name: 'piano', label: 'Piano' },
    { name: 'other', label: 'Other' },
  ],
  drum_split: [
    { name: 'kick', label: 'Kick' },
    { name: 'snare', label: 'Snare' },
    { name: 'hihat', label: 'Hi-Hat' },
    { name: 'cymbals', label: 'Cymbals' },
    { name: 'toms', label: 'Toms' },
  ],
};

function nowIso(): string {
  return new Date().toISOString();
}

function makeId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function stemsForMode(mode: string, outputDir: string, jobId: string, format: string): StemArtifact[] {
  const defs = MODE_STEMS[mode] ?? [
    { name: 'stem_a', label: 'Stem A' },
    { name: 'stem_b', label: 'Stem B' },
  ];
  const ext = format === 'm4a' ? 'm4a' : format === 'flac' ? 'flac' : 'wav';
  const mime = ext === 'wav' ? 'audio/wav' : ext === 'm4a' ? 'audio/mp4' : 'audio/flac';
  return defs.map((d) => ({
    name: d.name,
    label: d.label,
    uri: `file://${outputDir}/${jobId}/${d.name}.${ext}`,
    mimeType: mime,
    durationSeconds: 180,
    sampleRate: 44100,
    channels: 2,
    sizeBytes: 1024 * 1024 * 12,
  }));
}

export class MockSeparationEngine implements SeparationEngine {
  private jobs = new Map<string, Job>();
  private listeners = new Map<string, Set<(event: JobEvent) => void>>();
  private timers = new Map<string, ReturnType<typeof setInterval>>();
  private modelManager?: ModelManager;

  constructor(modelManager?: ModelManager) {
    this.modelManager = modelManager;
  }

  async getCapabilities(): Promise<EngineCapabilities> {
    const vocalPack = this.modelManager
      ? await this.modelManager.getPackForMode('vocal_instrumental')
      : null;
    const vocalInstalled = vocalPack?.status === 'installed';

    return {
      engineVersion: '0.0.1-mock',
      platform: 'ios',
      deviceModel: 'Mock Device',
      offline: true,
      runtimes: ['mock'],
      accelerators: ['cpu'],
      modes: [
        {
          id: 'vocal_instrumental',
          label: 'Vocal / Instrumental',
          description: 'Split a song into vocals and instrumental (MVP).',
          expectedStems: ['vocals', 'instrumental'],
          available: vocalInstalled,
          unavailableReason: vocalInstalled
            ? undefined
            : 'Model pack required. Download and verify the MVP model pack in Settings.',
          estimatedSpeed: 'fast',
          modelIds: ['uvr-mdx-net-inst-hq-3'],
        },
        {
          id: 'vocal_split',
          label: 'Vocal Split',
          description: 'Separate lead vocals, backing vocals, and instrumental.',
          expectedStems: ['lead_vocals', 'backing_vocals', 'instrumental'],
          available: false,
          unavailableReason: 'Post-MVP. MVP supports vocal_instrumental only.',
          estimatedSpeed: 'medium',
          modelIds: ['mock-vocal-split-v1'],
        },
        {
          id: 'full_stems',
          label: 'Full Stems',
          description: 'Split into drums, bass, vocals, guitar, piano, other.',
          expectedStems: ['drums', 'bass', 'vocals', 'guitar', 'piano', 'other'],
          available: false,
          unavailableReason: 'Post-MVP. MVP supports vocal_instrumental only.',
          estimatedSpeed: 'slow',
          modelIds: ['mock-full-v1'],
        },
        {
          id: 'drum_split',
          label: 'Drum Split',
          description: 'Split drum kit into components.',
          expectedStems: ['kick', 'snare', 'hihat', 'cymbals', 'toms'],
          available: false,
          unavailableReason: 'Post-MVP. Not available in mobile MVP.',
          estimatedSpeed: 'slow',
        },
      ],
      maxInputMinutes: 30,
      maxFileSizeBytes: 200 * 1024 * 1024,
    };
  }

  async prepare(mode: string, _options?: SeparationOptions): Promise<PrepareResult> {
    if (mode !== 'vocal_instrumental') {
      return {
        ok: false,
        error: {
          code: 'UNSUPPORTED_MODE',
          message: `Mode "${mode}" is not available in the mobile MVP. Only vocal_instrumental is supported.`,
          recoverable: false,
        },
      };
    }
    if (this.modelManager) {
      const pack = await this.modelManager.getPackForMode('vocal_instrumental');
      if (pack?.status !== 'installed') {
        return {
          ok: false,
          error: {
            code: 'MODEL_NOT_INSTALLED',
            message: 'Vocal / Instrumental model pack is required. Download it in Settings.',
            recoverable: true,
          },
        };
      }
      return {
        ok: true,
        modelId: pack.id,
        warnings: ['DEV-ONLY MOCK: no real model loaded.'],
      };
    }
    return { ok: true, modelId: 'mock-model', warnings: ['DEV-ONLY MOCK: no real model loaded.'] };
  }

  async startJob(request: SeparationRequest): Promise<Job> {
    if (request.mode !== 'vocal_instrumental') {
      throw new Error(
        `Mode "${request.mode}" is not available in the mobile MVP. Only vocal_instrumental is supported.`,
      );
    }
    const id = request.jobId ?? makeId();
    const displayName =
      request.displayName ?? request.inputUri.split('/').pop() ?? 'Untitled audio';
    const job: Job = {
      id,
      inputUri: request.inputUri,
      displayName,
      mode: request.mode,
      status: 'pending',
      progress: 0,
      stage: 'import',
      stageProgress: 0,
      message: 'Queued (mock)',
      createdAt: nowIso(),
      updatedAt: nowIso(),
      outputDir: request.outputDir,
      stems: [],
      warnings: ['DEV-ONLY MOCK: simulated separation, not real audio processing.'],
    };
    this.jobs.set(id, job);
    this.emit({ type: 'job_updated', job: { ...job } });
    this.simulate(id, request.options);
    return { ...job };
  }

  async getJob(jobId: string): Promise<Job | null> {
    const job = this.jobs.get(jobId);
    return job ? { ...job, stems: [...job.stems] } : null;
  }

  async listJobs(): Promise<Job[]> {
    return Array.from(this.jobs.values())
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .map((j) => ({ ...j, stems: [...j.stems] }));
  }

  async cancelJob(jobId: string): Promise<CancelResult> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return {
        ok: false,
        jobId,
        status: 'failed',
        error: { code: 'JOB_NOT_FOUND', message: 'Job not found.', recoverable: false },
      };
    }
    if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
      return { ok: false, jobId, status: job.status, error: { code: 'INVALID_STATE', message: `Job is ${job.status}.`, recoverable: false } };
    }
    this.clearTimer(jobId);
    job.status = 'cancelled';
    job.message = 'Cancelled by user (mock)';
    job.updatedAt = nowIso();
    job.completedAt = nowIso();
    this.jobs.set(jobId, job);
    this.emit({ type: 'job_cancelled', job: { ...job } });
    return { ok: true, jobId, status: 'cancelled' };
  }

  async deleteJob(jobId: string, _options?: DeleteJobOptions): Promise<void> {
    this.clearTimer(jobId);
    this.jobs.delete(jobId);
    this.listeners.delete(jobId);
  }

  subscribe(jobId: string, onEvent: (event: JobEvent) => void): () => void {
    const set = this.listeners.get(jobId) ?? new Set();
    set.add(onEvent);
    this.listeners.set(jobId, set);
    return () => {
      const current = this.listeners.get(jobId);
      if (!current) return;
      current.delete(onEvent);
      if (current.size === 0) this.listeners.delete(jobId);
    };
  }

  private emit(event: JobEvent): void {
    const set = this.listeners.get(event.job.id);
    if (!set) return;
    for (const cb of set) cb(event);
  }

  private clearTimer(jobId: string): void {
    const timer = this.timers.get(jobId);
    if (timer) clearInterval(timer);
    this.timers.delete(jobId);
  }

  private simulate(jobId: string, options?: SeparationOptions): void {
    let tick = 0;
    const totalTicks = 40;
    const timer = setInterval(() => {
      const job = this.jobs.get(jobId);
      if (!job) {
        this.clearTimer(jobId);
        return;
      }
      if (job.status === 'cancelled' || job.status === 'failed' || job.status === 'completed') {
        this.clearTimer(jobId);
        return;
      }

      tick += 1;
      const progress = Math.min(1, tick / totalTicks);
      const stageIndex = Math.min(
        MOCK_STAGES.length - 1,
        Math.floor(progress * MOCK_STAGES.length)
      );
      const stage = MOCK_STAGES[stageIndex];
      const stageStart = stageIndex / MOCK_STAGES.length;
      const stageEnd = (stageIndex + 1) / MOCK_STAGES.length;
      const stageProgress = Math.min(1, (progress - stageStart) / (stageEnd - stageStart || 1));

      job.status = progress >= 1 ? 'completed' : stage === 'encode' || stage === 'finalize' ? 'exporting' : 'running';
      job.progress = progress;
      job.stage = stage;
      job.stageProgress = stageProgress;
      job.message = progress >= 1 ? 'Completed (mock)' : `Mock ${stage.replace('_', ' ')}...`;
      job.updatedAt = nowIso();
      if (!job.startedAt) job.startedAt = job.updatedAt;

      if (progress >= 1) {
        job.status = 'completed';
        job.completedAt = nowIso();
        job.stems = stemsForMode(job.mode, job.outputDir, job.id, options?.outputFormat ?? 'wav');
        this.jobs.set(jobId, job);
        this.clearTimer(jobId);
        this.emit({ type: 'job_completed', job: { ...job, stems: [...job.stems] } });
        return;
      }

      this.jobs.set(jobId, job);
      this.emit({ type: 'job_updated', job: { ...job } });
    }, 250);

    this.timers.set(jobId, timer);
  }
}
