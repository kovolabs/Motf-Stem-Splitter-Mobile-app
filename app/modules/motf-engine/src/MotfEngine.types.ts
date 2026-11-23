/**
 * Types for the MotfEngine Expo module.
 *
 * Canonical contract lives in mobile/engine/contract.ts. This module re-exports
 * the shared types so the native bridge stays aligned with the app/engine boundary.
 *
 * SCAFFOLD: when this module is packaged independently, replace the relative
 * import with a copied/generated contract or a shared package.
 */
export type {
  CancelResult,
  DeleteJobOptions,
  EngineCapabilities,
  EngineError,
  EngineStage,
  Job,
  JobEvent,
  JobStatus,
  ModeCapability,
  OutputFormat,
  PrepareResult,
  QualityPreset,
  SeparationOptions,
  SeparationRequest,
  StemArtifact,
} from '../../../../engine/contract';

export { STEM_NAMES } from '../../../../engine/contract';

/** Native event name emitted by the MotfEngine module. */
export const MOTF_JOB_EVENT = 'MotfJobEvent' as const;

export type MotfJobEventName = typeof MOTF_JOB_EVENT;
