import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Job } from '../../../engine/contract';

type Props = {
  job: Job | null;
  onCancel: (jobId: string) => void;
};

function statusColor(status: Job['status']): string {
  switch (status) {
    case 'completed':
      return '#34d399';
    case 'failed':
      return '#f87171';
    case 'cancelled':
      return '#fbbf24';
    case 'running':
    case 'exporting':
    case 'preparing':
      return '#60a5fa';
    default:
      return '#9ca3af';
  }
}

export function ProgressScreen({ job, onCancel }: Props) {
  if (!job) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No job selected</Text>
        <Text style={styles.muted}>Create or select a job from the Jobs screen.</Text>
      </View>
    );
  }

  const canCancel = ['pending', 'preparing', 'running', 'exporting'].includes(job.status);
  const pct = Math.round(job.progress * 100);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Job Progress</Text>
        <Text style={styles.jobName}>{job.displayName}</Text>
        <Text style={styles.muted}>{job.inputUri}</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Status</Text>
          <Text style={[styles.value, { color: statusColor(job.status) }]}>{job.status}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Mode</Text>
          <Text style={styles.value}>{job.mode}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Stage</Text>
          <Text style={styles.value}>{job.stage ?? '-'}</Text>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.progressText}>{pct}% {job.message ? `· ${job.message}` : ''}</Text>

        {canCancel ? (
          <Pressable style={styles.cancelButton} onPress={() => onCancel(job.id)}>
            <Text style={styles.cancelButtonText}>Cancel Job</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Details</Text>
        <Detail label="Job ID" value={job.id} />
        <Detail label="Created" value={job.createdAt} />
        <Detail label="Updated" value={job.updatedAt} />
        <Detail label="Output dir" value={job.outputDir} />
        {job.error ? (
          <Detail label="Error" value={`${job.error.code}: ${job.error.message}`} valueColor="#f87171" />
        ) : null}
        {job.warnings?.length ? (
          <Detail label="Warnings" value={job.warnings.join('\n')} valueColor="#fbbf24" />
        ) : null}
        <Detail label="Stems" value={job.stems.length ? job.stems.map((s) => s.label).join(', ') : 'None yet'} />
      </View>
    </ScrollView>
  );
}

function Detail({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.detailValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  empty: { flex: 1, padding: 24, justifyContent: 'center', gap: 8 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  card: { backgroundColor: '#0A0A0A', borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: '#222222' },
  cardTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  jobName: { color: '#e5e7eb', fontSize: 15, fontWeight: '600' },
  muted: { color: '#9ca3af', fontSize: 12, lineHeight: 18 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  label: { color: '#9ca3af', fontSize: 13 },
  value: { color: '#e5e7eb', fontSize: 13, fontWeight: '600' },
  progressTrack: { height: 10, backgroundColor: '#1A1A1A', borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#C8FF00' },
  progressText: { color: '#c4c4d4', fontSize: 12 },
  cancelButton: { backgroundColor: '#3b1d1d', borderWidth: 1, borderColor: '#7f1d1d', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  cancelButtonText: { color: '#fca5a5', fontWeight: '700' },
  detailRow: { gap: 2, borderTopWidth: 1, borderTopColor: '#1A1A1A', paddingTop: 10 },
  detailValue: { color: '#d1d5db', fontSize: 12, lineHeight: 18 },
});
