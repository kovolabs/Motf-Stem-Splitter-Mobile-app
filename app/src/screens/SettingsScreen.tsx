import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { EngineCapabilities } from '../../../engine/contract';
import { USE_MOCK_ENGINE } from '../engine/engineBridge';
import type { ModelPack } from '../engine/modelManager';

type Props = {
  capabilities: EngineCapabilities | null;
  modelPacks: ModelPack[];
  onDownloadPack: (packId: string) => void | Promise<void>;
  onVerifyPack: (packId: string) => void | Promise<void>;
  onDeletePack: (packId: string) => void | Promise<void>;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(0)} MB`;
}

function statusLabel(status: ModelPack['status']): string {
  switch (status) {
    case 'installed':
      return 'INSTALLED';
    case 'downloading':
      return 'DOWNLOADING';
    case 'verifying':
      return 'VERIFYING';
    case 'error':
      return 'ERROR';
    case 'not_installed':
    default:
      return 'NOT INSTALLED';
  }
}

export function SettingsScreen({
  capabilities,
  modelPacks,
  onDownloadPack,
  onVerifyPack,
  onDeletePack,
}: Props) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Settings / Model Status</Text>
        <Text style={styles.muted}>
          Manage on-device model packs. Mock/dev scaffold only: downloads are simulated and no real
          model files are fetched.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Model Packs</Text>
        <Text style={styles.muted}>
          After a pack is downloaded and verified, separation can run offline on-device. No audio
          upload is required.
        </Text>
        {modelPacks.length === 0 ? (
          <Text style={styles.muted}>No model packs configured.</Text>
        ) : (
          modelPacks.map((pack) => {
            const busy = pack.status === 'downloading' || pack.status === 'verifying';
            const installed = pack.status === 'installed';
            return (
              <View key={pack.id} style={styles.packRow}>
                <View style={styles.packHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modeLabel}>{pack.label}</Text>
                    <Text style={styles.modeMeta}>
                      {pack.id} · v{pack.version} · {formatBytes(pack.sizeBytes)}
                    </Text>
                  </View>
                  <Text style={[styles.badge, installed ? styles.badgeOk : busy ? styles.badgeBusy : styles.badgeNo]}>
                    {statusLabel(pack.status)}
                  </Text>
                </View>

                <Detail label="Mode" value={pack.mode} />
                <Detail label="License" value={pack.license} />
                <Detail label="Checksum" value={pack.checksum} />
                {pack.installedAt ? <Detail label="Installed" value={pack.installedAt} /> : null}
                {pack.message ? <Text style={styles.packMessage}>{pack.message}</Text> : null}

                {busy ? (
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${Math.round(pack.progress * 100)}%` }]} />
                  </View>
                ) : null}

                <View style={styles.actions}>
                  {!installed ? (
                    <Pressable
                      style={[styles.actionButton, styles.actionPrimary, busy && styles.actionDisabled]}
                      disabled={busy}
                      onPress={() => void onDownloadPack(pack.id)}
                    >
                      <Text style={styles.actionPrimaryText}>
                        {pack.status === 'error' ? 'Retry Download' : 'Download'}
                      </Text>
                    </Pressable>
                  ) : null}
                  {installed ? (
                    <Pressable
                      style={[styles.actionButton, busy && styles.actionDisabled]}
                      disabled={busy}
                      onPress={() => void onVerifyPack(pack.id)}
                    >
                      <Text style={styles.actionText}>Verify</Text>
                    </Pressable>
                  ) : null}
                  {pack.status !== 'not_installed' ? (
                    <Pressable
                      style={[styles.actionButton, styles.actionDanger, busy && styles.actionDisabled]}
                      disabled={busy}
                      onPress={() => void onDeletePack(pack.id)}
                    >
                      <Text style={styles.actionDangerText}>Delete</Text>
                    </Pressable>
                  ) : null}
                </View>

                {installed ? (
                  <Text style={styles.offlineNote}>
                    Offline ready: this pack is installed locally. Future vocal/instrumental jobs can
                    run without network access.
                  </Text>
                ) : (
                  <Text style={styles.offlineNoteMuted}>
                    Not offline ready yet. Download and verify the pack to enable on-device vocal/instrumental separation.
                  </Text>
                )}
              </View>
            );
          })
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Engine</Text>
        <Detail label="Implementation" value={USE_MOCK_ENGINE ? 'MockSeparationEngine (DEV-ONLY)' : 'Native/Unimplemented'} />
        <Detail label="Engine version" value={capabilities?.engineVersion ?? 'Unknown'} />
        <Detail label="Platform" value={capabilities?.platform ?? 'Unknown'} />
        <Detail label="Device" value={capabilities?.deviceModel ?? 'Unknown'} />
        <Detail label="Offline" value={capabilities?.offline ? 'Yes' : 'Unknown'} />
        <Detail label="Runtimes" value={capabilities?.runtimes?.join(', ') || 'None'} />
        <Detail label="Accelerators" value={capabilities?.accelerators?.join(', ') || 'None'} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mode / Capability Status</Text>
        {(capabilities?.modes ?? []).length === 0 ? (
          <Text style={styles.muted}>No capabilities reported.</Text>
        ) : (
          capabilities!.modes.map((mode) => (
            <View key={mode.id} style={styles.modeRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modeLabel}>{mode.label}</Text>
                <Text style={styles.modeMeta}>{mode.id} · {mode.expectedStems.join(', ')}</Text>
                {mode.unavailableReason ? (
                  <Text style={styles.modeWarn}>{mode.unavailableReason}</Text>
                ) : null}
              </View>
              <Text style={[styles.badge, mode.available ? styles.badgeOk : styles.badgeNo]}>
                {mode.available ? 'READY' : 'MISSING'}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  card: { backgroundColor: '#0A0A0A', borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: '#222222' },
  cardTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  muted: { color: '#9ca3af', fontSize: 13, lineHeight: 19 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, borderTopWidth: 1, borderTopColor: '#1A1A1A', paddingTop: 10 },
  detailLabel: { color: '#9ca3af', fontSize: 13 },
  detailValue: { color: '#e5e7eb', fontSize: 13, fontWeight: '600', flex: 1, textAlign: 'right' },
  modeRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', borderTopWidth: 1, borderTopColor: '#1A1A1A', paddingTop: 10 },
  modeLabel: { color: '#f3f4f6', fontSize: 14, fontWeight: '600' },
  modeMeta: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
  modeWarn: { color: '#fbbf24', fontSize: 12, marginTop: 2 },
  badge: { fontSize: 10, fontWeight: '700', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999, overflow: 'hidden' },
  badgeOk: { color: '#34d399', backgroundColor: '#14291f' },
  badgeNo: { color: '#fbbf24', backgroundColor: '#2b2412' },
  badgeBusy: { color: '#93c5fd', backgroundColor: '#172554' },
  packRow: { gap: 10, borderTopWidth: 1, borderTopColor: '#1A1A1A', paddingTop: 12 },
  packHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  packMessage: { color: '#d1d5db', fontSize: 12, lineHeight: 18 },
  progressTrack: { height: 8, backgroundColor: '#1A1A1A', borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: '#C8FF00' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionButton: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#2A2A2A', backgroundColor: '#141414' },
  actionPrimary: { backgroundColor: '#C8FF00', borderColor: '#C8FF00' },
  actionDanger: { backgroundColor: '#2a1717', borderColor: '#7f1d1d' },
  actionDisabled: { opacity: 0.5 },
  actionText: { color: '#e5e7eb', fontSize: 12, fontWeight: '700' },
  actionPrimaryText: { color: '#000000', fontSize: 12, fontWeight: '700' },
  actionDangerText: { color: '#fca5a5', fontSize: 12, fontWeight: '700' },
  offlineNote: { color: '#34d399', fontSize: 12, lineHeight: 18 },
  offlineNoteMuted: { color: '#9ca3af', fontSize: 12, lineHeight: 18 },
});
