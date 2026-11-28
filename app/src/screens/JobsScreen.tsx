import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { EngineCapabilities, Job } from '../../../engine/contract';

type Props = {
  jobs: Job[];
  capabilities: EngineCapabilities | null;
  onCreateJob: (input: { displayName: string; inputUri: string; mode: string }) => void;
  onSelectJob: (jobId: string) => void;
  selectedJobId: string | null;
  onGoToSettings: () => void;
};

export function JobsScreen({ jobs, capabilities, onCreateJob, onSelectJob, selectedJobId, onGoToSettings }: Props) {
  const modes = capabilities?.modes ?? [];
  const defaultMode = useMemo(
    () => modes.find((m) => m.id === 'vocal_instrumental')?.id ?? modes.find((m) => m.available)?.id ?? 'vocal_instrumental',
    [modes]
  );
  const [mode, setMode] = useState<string>('');
  const [name, setName] = useState('My Song.wav');
  const activeMode = mode || defaultMode;
  const activeModeCapability = modes.find((m) => m.id === activeMode);
  const modelRequired = activeMode === 'vocal_instrumental' && !activeModeCapability?.available;
  const canCreate = !modelRequired;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Import / New Job</Text>
        <Text style={styles.muted}>
          Scaffold-only import. This creates a mock local file job; no real file picker or
          audio upload.
        </Text>
        <Text style={styles.label}>Display name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Audio file name"
          placeholderTextColor="#6b7280"
          style={styles.input}
        />
        <Text style={styles.label}>Mode</Text>
        <View style={styles.modeList}>
          {modes.map((m) => {
            const selected = m.id === activeMode;
            return (
              <Pressable
                key={m.id}
                onPress={() => setMode(m.id)}
                style={[styles.modeChip, selected && styles.modeChipSelected, !m.available && styles.modeChipDisabled]}
              >
                <Text style={[styles.modeChipText, selected && styles.modeChipTextSelected]}>
                  {m.label}
                </Text>
                {!m.available ? (
                  <Text style={styles.modeChipSub}>{m.unavailableReason ?? 'Unavailable'}</Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
        {modelRequired ? (
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>Model pack required</Text>
            <Text style={styles.warningText}>
              Vocal / Instrumental mode needs the on-device model pack before jobs can run. Download
              and verify it in Settings. After download, separation works offline.
            </Text>
            <Pressable style={styles.secondaryButton} onPress={onGoToSettings}>
              <Text style={styles.secondaryButtonText}>Go to Settings</Text>
            </Pressable>
          </View>
        ) : null}
        <Pressable
          style={[styles.primaryButton, !canCreate && styles.primaryButtonDisabled]}
          disabled={!canCreate}
          onPress={() =>
            onCreateJob({
              displayName: name.trim() || 'Untitled audio',
              inputUri: `file:///mock/audio/${encodeURIComponent(name.trim() || 'untitled.wav')}`,
              mode: activeMode,
            })
          }
        >
          <Text style={styles.primaryButtonText}>Create Mock Job</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Jobs</Text>
        {jobs.length === 0 ? (
          <Text style={styles.muted}>No jobs yet. Create a mock job to test the flow.</Text>
        ) : (
          jobs.map((job) => {
            const selected = job.id === selectedJobId;
            return (
              <Pressable
                key={job.id}
                onPress={() => onSelectJob(job.id)}
                style={[styles.jobRow, selected && styles.jobRowSelected]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.jobName}>{job.displayName}</Text>
                  <Text style={styles.jobMeta}>
                    {job.mode} · {job.status} · {Math.round(job.progress * 100)}%
                  </Text>
                </View>
                <Text style={styles.jobChevron}>{selected ? '●' : '○'}</Text>
              </Pressable>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  card: { backgroundColor: '#0A0A0A', borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: '#222222' },
  cardTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  muted: { color: '#9ca3af', fontSize: 13, lineHeight: 19 },
  label: { color: '#d1d5db', fontSize: 13, fontWeight: '600' },
  input: {
    backgroundColor: '#000000',
    color: '#fff',
    borderWidth: 1,
    borderColor: '#222222',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  modeList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modeChip: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, backgroundColor: '#141414', borderWidth: 1, borderColor: '#2A2A2A' },
  modeChipSelected: { backgroundColor: '#1A1A1A', borderColor: '#C8FF00' },
  modeChipDisabled: { opacity: 0.45 },
  modeChipText: { color: '#d1d5db', fontSize: 12, fontWeight: '600' },
  modeChipTextSelected: { color: '#fff' },
  modeChipSub: { color: '#9ca3af', fontSize: 10, marginTop: 2 },
  primaryButton: { backgroundColor: '#C8FF00', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  primaryButtonDisabled: { opacity: 0.45 },
  primaryButtonText: { color: '#000000', fontWeight: '700', fontSize: 14 },
  warningBox: { backgroundColor: '#2b2412', borderWidth: 1, borderColor: '#92700c', borderRadius: 12, padding: 12, gap: 8 },
  warningTitle: { color: '#fde68a', fontSize: 13, fontWeight: '700' },
  warningText: { color: '#fcd34d', fontSize: 12, lineHeight: 18 },
  secondaryButton: { alignSelf: 'flex-start', backgroundColor: '#3b2f12', borderWidth: 1, borderColor: '#92700c', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  secondaryButtonText: { color: '#fde68a', fontSize: 12, fontWeight: '700' },
  jobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
  },
  jobRowSelected: { backgroundColor: '#141414', marginHorizontal: -8, paddingHorizontal: 8, borderRadius: 8 },
  jobName: { color: '#f3f4f6', fontSize: 14, fontWeight: '600' },
  jobMeta: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
  jobChevron: { color: '#C8FF00', fontSize: 16 },
});
