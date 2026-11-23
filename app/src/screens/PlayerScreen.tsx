import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Job } from '../../../engine/contract';

type Props = {
  job: Job | null;
};

type StemState = { muted: boolean; solo: boolean; volume: number };

export function PlayerScreen({ job }: Props) {
  const [stemState, setStemState] = useState<Record<string, StemState>>({});

  useEffect(() => {
    if (!job) return;
    setStemState((prev) => {
      const next: Record<string, StemState> = {};
      for (const stem of job.stems) {
        next[stem.name] = prev[stem.name] ?? { muted: false, solo: false, volume: 80 };
      }
      return next;
    });
  }, [job?.id, job?.stems.length]);

  if (!job) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Player / Mixer</Text>
        <Text style={styles.muted}>Select a job to inspect stems. Completed jobs show mixer controls.</Text>
      </View>
    );
  }

  const hasStems = job.stems.length > 0;
  const anySolo = Object.values(stemState).some((s) => s.solo);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Player / Mixer Placeholder</Text>
        <Text style={styles.muted}>
          No real audio playback yet. This scaffold shows stem artifacts and mock mixer state.
        </Text>
        <Text style={styles.jobName}>{job.displayName}</Text>
        <Text style={styles.meta}>{job.status} · {job.mode}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Transport (Placeholder)</Text>
        <View style={styles.transportRow}>
          {['⏮', '▶/⏸', '⏭'].map((label) => (
            <View key={label} style={styles.transportBtn}>
              <Text style={styles.transportText}>{label}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.muted}>00:00 / 03:00 · playback engine not wired in scaffold.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Stems</Text>
        {!hasStems ? (
          <Text style={styles.muted}>
            {job.status === 'completed' ? 'No stem artifacts reported.' : 'Stems will appear when the job completes.'}
          </Text>
        ) : (
          job.stems.map((stem) => {
            const state = stemState[stem.name] ?? { muted: false, solo: false, volume: 80 };
            const audible = !state.muted && (!anySolo || state.solo);
            return (
              <View key={stem.name} style={styles.stemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stemLabel}>{stem.label}</Text>
                  <Text style={styles.stemMeta}>{stem.name} · {stem.mimeType}</Text>
                  <Text style={styles.stemUri} numberOfLines={1}>{stem.uri}</Text>
                </View>
                <View style={styles.stemControls}>
                  <Pressable
                    style={[styles.smallBtn, state.muted && styles.smallBtnWarn]}
                    onPress={() =>
                      setStemState((p) => ({ ...p, [stem.name]: { ...state, muted: !state.muted } }))
                    }
                  >
                    <Text style={styles.smallBtnText}>M</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.smallBtn, state.solo && styles.smallBtnActive]}
                    onPress={() =>
                      setStemState((p) => ({ ...p, [stem.name]: { ...state, solo: !state.solo } }))
                    }
                  >
                    <Text style={styles.smallBtnText}>S</Text>
                  </Pressable>
                  <Pressable
                    style={styles.smallBtn}
                    onPress={() =>
                      setStemState((p) => ({
                        ...p,
                        [stem.name]: { ...state, volume: Math.max(0, state.volume - 10) },
                      }))
                    }
                  >
                    <Text style={styles.smallBtnText}>-</Text>
                  </Pressable>
                  <Text style={styles.volText}>{state.volume}</Text>
                  <Pressable
                    style={styles.smallBtn}
                    onPress={() =>
                      setStemState((p) => ({
                        ...p,
                        [stem.name]: { ...state, volume: Math.min(100, state.volume + 10) },
                      }))
                    }
                  >
                    <Text style={styles.smallBtnText}>+</Text>
                  </Pressable>
                </View>
                <Text style={[styles.audible, { color: audible ? '#34d399' : '#6b7280' }]}>
                  {audible ? 'AUDIBLE' : 'OFF'}
                </Text>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  empty: { flex: 1, padding: 24, justifyContent: 'center', gap: 8 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  card: { backgroundColor: '#141426', borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: '#2b2b45' },
  cardTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  muted: { color: '#9ca3af', fontSize: 13, lineHeight: 19 },
  jobName: { color: '#e5e7eb', fontSize: 15, fontWeight: '600' },
  meta: { color: '#9ca3af', fontSize: 12 },
  transportRow: { flexDirection: 'row', gap: 12 },
  transportBtn: { width: 52, height: 44, borderRadius: 10, backgroundColor: '#1b1b32', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#30304f' },
  transportText: { color: '#fff', fontSize: 16 },
  stemRow: { gap: 8, borderTopWidth: 1, borderTopColor: '#23233d', paddingTop: 12 },
  stemLabel: { color: '#f3f4f6', fontSize: 14, fontWeight: '600' },
  stemMeta: { color: '#9ca3af', fontSize: 12 },
  stemUri: { color: '#6b7280', fontSize: 11 },
  stemControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  smallBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#1b1b32', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#30304f' },
  smallBtnActive: { backgroundColor: '#2d2457', borderColor: '#7c3aed' },
  smallBtnWarn: { backgroundColor: '#3b2a1d', borderColor: '#b45309' },
  smallBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  volText: { color: '#d1d5db', width: 28, textAlign: 'center', fontSize: 12 },
  audible: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
});
