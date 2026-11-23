/**
 * Model pack manager - types and mock implementation for downloadable on-device models.
 *
 * DEV-ONLY: MockModelManager simulates download/verify/install without network or filesystem.
 * Replace with a real implementation that uses expo-file-system/FFI/native modules.
 */
import type { SeparationOptions } from '../../../engine/contract';

export type ModelPackStatus =
  | 'not_installed'
  | 'downloading'
  | 'installed'
  | 'verifying'
  | 'error';

export interface ModelPack {
  /** Stable pack identifier, e.g. "uvr-mdx-net-inst-hq-3" */
  id: string;
  /** Separation mode this pack enables */
  mode: string;
  /** Human-readable pack name */
  label: string;
  /** Pack/model version */
  version: string;
  /** Approximate download size in bytes */
  sizeBytes: number;
  /** Expected checksum for integrity verification (e.g. sha256 hex) */
  checksum: string;
  /** License identifier or short label */
  license: string;
  /** Current install/download status */
  status: ModelPackStatus;
  /** Download progress 0..1 when status is downloading/verifying */
  progress: number;
  /** User-facing status/error message */
  message?: string;
  /** When the pack was installed */
  installedAt?: string;
}

export type ModelManagerEvent =
  | { type: 'pack_updated'; pack: ModelPack }
  | { type: 'packs_changed'; packs: ModelPack[] };

export interface ModelManager {
  listPacks(): Promise<ModelPack[]>;
  getPack(packId: string): Promise<ModelPack | null>;
  getPackForMode(mode: string): Promise<ModelPack | null>;
  downloadPack(packId: string): Promise<ModelPack>;
  verifyPack(packId: string): Promise<ModelPack>;
  deletePack(packId: string): Promise<ModelPack>;
  subscribe(listener: (event: ModelManagerEvent) => void): () => void;
}

function nowIso(): string {
  return new Date().toISOString();
}

function clonePack(pack: ModelPack): ModelPack {
  return { ...pack };
}

/**
 * Default MVP model pack candidate.
 *
 * DEV-ONLY MOCK: size/checksum are placeholders until a real model file is
 * approved, downloaded, and hashed. Do not ship without verified license,
 * checksum, and on-device validation. See mobile/docs/MODEL_SELECTION.md.
 */
const DEFAULT_PACKS: ModelPack[] = [
  {
    id: 'uvr-mdx-net-inst-hq-3',
    mode: 'vocal_instrumental',
    label: 'UVR MDX-Net Inst HQ 3 (Vocals / Instrumental)',
    version: '1.0.0-candidate',
    sizeBytes: 66759214,
    checksum: 'sha256:PENDING_REAL_CHECKSUM_AFTER_MODEL_APPROVAL',
    license: 'MIT (pending provenance/redistribution verification - see MODEL_SELECTION.md)',
    status: 'not_installed',
    progress: 0,
    message:
      'Candidate model pack. Download required after approval; verify checksum and license before enabling real separation.',
  },
];

export class MockModelManager implements ModelManager {
  private packs: Map<string, ModelPack>;
  private listeners = new Set<(event: ModelManagerEvent) => void>();
  private timers = new Map<string, ReturnType<typeof setInterval>>();

  constructor(initialPacks: ModelPack[] = DEFAULT_PACKS) {
    this.packs = new Map(initialPacks.map((p) => [p.id, clonePack(p)]));
  }

  async listPacks(): Promise<ModelPack[]> {
    return Array.from(this.packs.values()).map(clonePack);
  }

  async getPack(packId: string): Promise<ModelPack | null> {
    const pack = this.packs.get(packId);
    return pack ? clonePack(pack) : null;
  }

  async getPackForMode(mode: string): Promise<ModelPack | null> {
    const pack = Array.from(this.packs.values()).find((p) => p.mode === mode);
    return pack ? clonePack(pack) : null;
  }

  async downloadPack(packId: string): Promise<ModelPack> {
    const pack = this.requirePack(packId);
    if (pack.status === 'downloading' || pack.status === 'verifying') {
      return clonePack(pack);
    }
    this.clearTimer(packId);
    pack.status = 'downloading';
    pack.progress = 0;
    pack.message = 'Downloading model pack (mock)...';
    pack.installedAt = undefined;
    this.packs.set(packId, pack);
    this.emitPack(pack);
    this.simulateDownload(packId);
    return clonePack(pack);
  }

  async verifyPack(packId: string): Promise<ModelPack> {
    const pack = this.requirePack(packId);
    if (pack.status !== 'installed' && pack.status !== 'error') {
      return clonePack(pack);
    }
    this.clearTimer(packId);
    pack.status = 'verifying';
    pack.progress = 0;
    pack.message = 'Verifying checksum (mock)...';
    this.packs.set(packId, pack);
    this.emitPack(pack);
    this.simulateVerify(packId);
    return clonePack(pack);
  }

  async deletePack(packId: string): Promise<ModelPack> {
    const pack = this.requirePack(packId);
    this.clearTimer(packId);
    pack.status = 'not_installed';
    pack.progress = 0;
    pack.installedAt = undefined;
    pack.message = 'Model pack removed. Download required before on-device separation.';
    this.packs.set(packId, pack);
    this.emitPack(pack);
    return clonePack(pack);
  }

  subscribe(listener: (event: ModelManagerEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Test/helper: set pack state directly. */
  _setPackStatus(packId: string, status: ModelPackStatus, message?: string): void {
    const pack = this.requirePack(packId);
    pack.status = status;
    pack.progress = status === 'installed' ? 1 : 0;
    pack.message = message;
    pack.installedAt = status === 'installed' ? nowIso() : undefined;
    this.packs.set(packId, pack);
    this.emitPack(pack);
  }

  private requirePack(packId: string): ModelPack {
    const pack = this.packs.get(packId);
    if (!pack) throw new Error(`Unknown model pack: ${packId}`);
    return pack;
  }

  private emitPack(pack: ModelPack): void {
    const snapshot = clonePack(pack);
    const event: ModelManagerEvent = { type: 'pack_updated', pack: snapshot };
    for (const listener of this.listeners) listener(event);
  }

  private clearTimer(packId: string): void {
    const timer = this.timers.get(packId);
    if (timer) clearInterval(timer);
    this.timers.delete(packId);
  }

  private simulateDownload(packId: string): void {
    let progress = 0;
    const timer = setInterval(() => {
      const pack = this.packs.get(packId);
      if (!pack || pack.status !== 'downloading') {
        this.clearTimer(packId);
        return;
      }
      progress = Math.min(1, progress + 0.08 + Math.random() * 0.08);
      pack.progress = progress;
      pack.message =
        progress >= 1
          ? 'Download complete. Verifying...'
          : `Downloading model pack (mock) ${Math.round(progress * 100)}%`;
      if (progress >= 1) {
        this.packs.set(packId, pack);
        this.clearTimer(packId);
        this.emitPack(pack);
        void this.verifyPack(packId);
        return;
      }
      this.packs.set(packId, pack);
      this.emitPack(pack);
    }, 300);
    this.timers.set(packId, timer);
  }

  private simulateVerify(packId: string): void {
    let progress = 0;
    const timer = setInterval(() => {
      const pack = this.packs.get(packId);
      if (!pack || pack.status !== 'verifying') {
        this.clearTimer(packId);
        return;
      }
      progress = Math.min(1, progress + 0.2);
      pack.progress = progress;
      pack.message = progress >= 1 ? 'Installed and verified. Ready for offline use.' : 'Verifying checksum (mock)...';
      if (progress >= 1) {
        pack.status = 'installed';
        pack.installedAt = nowIso();
        this.packs.set(packId, pack);
        this.clearTimer(packId);
        this.emitPack(pack);
        return;
      }
      this.packs.set(packId, pack);
      this.emitPack(pack);
    }, 250);
    this.timers.set(packId, timer);
  }
}

/** Shared mock model manager for the dev scaffold. */
export const modelManager: ModelManager = new MockModelManager();
