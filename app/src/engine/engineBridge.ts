import type {
  CancelResult,
  DeleteJobOptions,
  EngineCapabilities,
  Job,
  JobEvent,
  PrepareResult,
  SeparationEngine,
  SeparationOptions,
  SeparationRequest,
} from '../../../engine/contract';
import { MockSeparationEngine } from './mockEngine';
import { modelManager } from './modelManager';
// SCAFFOLD: local Expo module bridge. Safe to import at module load because it
// lazily requires the native module only when methods are called.
import { MotfEngineModule } from '../../modules/motf-engine';

export type EngineImpl = 'mock' | 'native' | 'unimplemented';

/**
 * Engine bridge - selects the active SeparationEngine implementation.
 *
 * Default is mock for safe UI development. Set EXPO_PUBLIC_MOTF_ENGINE=native
 * in a custom dev client build only after the native ONNX/audio pipeline is
 * implemented and validated on device.
 */
const envImpl =
  typeof process !== 'undefined'
    ? (process.env?.EXPO_PUBLIC_MOTF_ENGINE as EngineImpl | undefined)
    : undefined;
export const ENGINE_IMPL: EngineImpl =
  envImpl === 'native' || envImpl === 'unimplemented' ? envImpl : 'mock';
export const USE_MOCK_ENGINE = ENGINE_IMPL === 'mock';

export class UnimplementedEngine implements SeparationEngine {
  async getCapabilities(): Promise<EngineCapabilities> {
    return {
      engineVersion: '0.0.0-scaffold',
      platform: 'ios',
      offline: true,
      runtimes: [],
      accelerators: [],
      modes: [],
    };
  }

  async prepare(_mode: string, _options?: SeparationOptions): Promise<PrepareResult> {
    return {
      ok: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Native engine not implemented yet.',
        recoverable: false,
      },
    };
  }

  async startJob(_request: SeparationRequest): Promise<Job> {
    throw new Error('Native engine not implemented yet.');
  }

  async getJob(_jobId: string): Promise<Job | null> {
    return null;
  }

  async listJobs(): Promise<Job[]> {
    return [];
  }

  async cancelJob(jobId: string): Promise<CancelResult> {
    return {
      ok: false,
      jobId,
      status: 'failed',
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Native engine not implemented yet.',
        recoverable: false,
      },
    };
  }

  async deleteJob(_jobId: string, _options?: DeleteJobOptions): Promise<void> {
    return;
  }

  subscribe(_jobId: string, _onEvent: (event: JobEvent) => void): () => void {
    return () => {};
  }
}

/**
 * Future native engine adapter.
 *
 * SCAFFOLD: delegates to the local Expo module in mobile/app/modules/motf-engine.
 * The native module currently returns NOT_IMPLEMENTED/stub responses until
 * ONNX Runtime Mobile / Core ML / NNAPI are wired. Keep mock flow as default.
 */
export class NativeMotfEngine implements SeparationEngine {
  async getCapabilities(): Promise<EngineCapabilities> {
    return MotfEngineModule.getCapabilities();
  }

  async prepare(mode: string, options?: SeparationOptions): Promise<PrepareResult> {
    return MotfEngineModule.prepare(mode, options);
  }

  async startJob(request: SeparationRequest): Promise<Job> {
    return MotfEngineModule.startJob(request);
  }

  async getJob(jobId: string): Promise<Job | null> {
    return MotfEngineModule.getJob(jobId);
  }

  async listJobs(): Promise<Job[]> {
    return MotfEngineModule.listJobs();
  }

  async cancelJob(jobId: string): Promise<CancelResult> {
    return MotfEngineModule.cancelJob(jobId);
  }

  async deleteJob(jobId: string, options?: DeleteJobOptions): Promise<void> {
    return MotfEngineModule.deleteJob(jobId, options);
  }

  subscribe(jobId: string, onEvent: (event: JobEvent) => void): () => void {
    return MotfEngineModule.subscribe(jobId, onEvent);
  }
}

export { modelManager };

export function createEngine(impl: EngineImpl = ENGINE_IMPL): SeparationEngine {
  if (impl === 'native') return new NativeMotfEngine();
  if (impl === 'unimplemented') return new UnimplementedEngine();
  return new MockSeparationEngine(modelManager);
}

// Default engine for app UI. Mock by default; native only with explicit env opt-in.
export const engine: SeparationEngine = createEngine(ENGINE_IMPL);

// Explicit handles useful for tests/dev tooling.
export const nativeEngine: SeparationEngine = new NativeMotfEngine();
export const mockEngine: SeparationEngine = new MockSeparationEngine(modelManager);
