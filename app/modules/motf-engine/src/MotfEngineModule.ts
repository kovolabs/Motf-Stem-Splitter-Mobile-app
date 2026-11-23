import { EventEmitter, requireNativeModule } from 'expo-modules-core';

import type {
  CancelResult,
  DeleteJobOptions,
  EngineCapabilities,
  Job,
  JobEvent,
  PrepareResult,
  SeparationOptions,
  SeparationRequest,
} from './MotfEngine.types';
import { MOTF_JOB_EVENT } from './MotfEngine.types';

/**
 * Native MotfEngine module contract (Expo Modules).
 *
 * SCAFFOLD: this mirrors mobile/engine/native/BRIDGE.md. The native
 * implementations are stubs until ONNX Runtime Mobile / Core ML are wired in.
 */
export type MotfEngineNativeModule = {
  getCapabilities(): Promise<EngineCapabilities>;
  prepare(args: { mode: string; options?: SeparationOptions }): Promise<PrepareResult>;
  startJob(request: SeparationRequest): Promise<Job>;
  getJob(args: { jobId: string }): Promise<Job | null>;
  listJobs(): Promise<Job[]>;
  cancelJob(args: { jobId: string }): Promise<CancelResult>;
  deleteJob(args: { jobId: string; options?: DeleteJobOptions }): Promise<void | { ok: true }>;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
};

/**
 * Lazily require the native module. Throws a clear error if the module is not
 * available (e.g. running in Expo Go without a custom dev client).
 */
export function getNativeMotfEngine(): MotfEngineNativeModule {
  return requireNativeModule<MotfEngineNativeModule>('MotfEngine');
}

type EventSubscription = { remove(): void };

let _emitter: InstanceType<typeof EventEmitter> | null = null;

function getEmitter(): InstanceType<typeof EventEmitter> {
  if (!_emitter) {
    _emitter = new EventEmitter(getNativeMotfEngine() as any);
  }
  return _emitter;
}

/**
 * Subscribe to job events for a specific job.
 *
 * The native layer emits `MotfJobEvent` with `{ type, job }`. This wrapper
 * filters by job.id to satisfy the SeparationEngine.subscribe contract.
 */
export function subscribeToJob(jobId: string, onEvent: (event: JobEvent) => void): () => void {
  const subscription: EventSubscription = getEmitter().addListener(MOTF_JOB_EVENT, (event: JobEvent) => {
    if (event?.job?.id === jobId) onEvent(event);
  });
  return () => subscription.remove();
}

/**
 * Convenience wrapper with bridge-shaped method signatures.
 * Feature code should prefer the SeparationEngine adapter in engineBridge.ts.
 */
export const MotfEngineModule = {
  getCapabilities: () => getNativeMotfEngine().getCapabilities(),
  prepare: (mode: string, options?: SeparationOptions) =>
    getNativeMotfEngine().prepare({ mode, options }),
  startJob: (request: SeparationRequest) => getNativeMotfEngine().startJob(request),
  getJob: (jobId: string) => getNativeMotfEngine().getJob({ jobId }),
  listJobs: () => getNativeMotfEngine().listJobs(),
  cancelJob: (jobId: string) => getNativeMotfEngine().cancelJob({ jobId }),
  deleteJob: async (jobId: string, options?: DeleteJobOptions): Promise<void> => {
    await getNativeMotfEngine().deleteJob({ jobId, options });
  },
  subscribe: subscribeToJob,
};
