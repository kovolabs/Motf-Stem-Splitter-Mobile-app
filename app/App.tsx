import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Linking, SafeAreaView, StyleSheet, Text, Pressable, View } from 'react-native';
import type { EngineCapabilities, Job } from '../engine/contract';
import { engine, modelManager } from './src/engine/engineBridge';
import type { ModelPack } from './src/engine/modelManager';
import { JobsScreen } from './src/screens/JobsScreen';
import { PlayerScreen } from './src/screens/PlayerScreen';
import { ProgressScreen } from './src/screens/ProgressScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

type Tab = 'jobs' | 'progress' | 'player' | 'settings';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'jobs', label: 'Jobs' },
  { id: 'progress', label: 'Progress' },
  { id: 'player', label: 'Player' },
  { id: 'settings', label: 'Settings' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('jobs');
  const [capabilities, setCapabilities] = useState<EngineCapabilities | null>(null);
  const [modelPacks, setModelPacks] = useState<ModelPack[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const unsubsRef = useRef<Record<string, () => void>>({});

  const refreshJobs = useCallback(async () => {
    const next = await engine.listJobs();
    setJobs(next);
  }, []);

  const refreshCapabilities = useCallback(async () => {
    const [caps, packs] = await Promise.all([engine.getCapabilities(), modelManager.listPacks()]);
    setCapabilities(caps);
    setModelPacks(packs);
  }, []);

  const upsertJob = useCallback((job: Job) => {
    setJobs((prev) => {
      const idx = prev.findIndex((j) => j.id === job.id);
      if (idx === -1) return [job, ...prev].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      const next = [...prev];
      next[idx] = job;
      return next;
    });
  }, []);

  const ensureSubscription = useCallback(
    (jobId: string) => {
      if (unsubsRef.current[jobId]) return;
      unsubsRef.current[jobId] = engine.subscribe(jobId, (event) => {
        upsertJob(event.job);
        if (event.type !== 'job_updated') {
          // Terminal event - unsubscribe to avoid leaks.
          unsubsRef.current[jobId]?.();
          delete unsubsRef.current[jobId];
        }
      });
    },
    [upsertJob]
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [caps, packs, existingJobs] = await Promise.all([
        engine.getCapabilities(),
        modelManager.listPacks(),
        engine.listJobs(),
      ]);
      if (!mounted) return;
      setCapabilities(caps);
      setModelPacks(packs);
      setJobs(existingJobs);
      for (const j of existingJobs) {
        if (['pending', 'preparing', 'running', 'exporting'].includes(j.status)) {
          ensureSubscription(j.id);
        }
      }
      if (existingJobs.length > 0) setSelectedJobId((prev) => prev ?? existingJobs[0].id);
    })();

    const unsubModels = modelManager.subscribe(() => {
      void refreshCapabilities();
    });

    return () => {
      mounted = false;
      unsubModels();
      for (const unsub of Object.values(unsubsRef.current)) unsub();
      unsubsRef.current = {};
    };
  }, [ensureSubscription, refreshCapabilities]);

  const handleCreateJob = useCallback(
    async (input: { displayName: string; inputUri: string; mode: string }) => {
      const job = await engine.startJob({
        inputUri: input.inputUri,
        displayName: input.displayName,
        mode: input.mode,
        outputDir: 'file:///mock/output',
        options: { outputFormat: 'wav', quality: 'balanced' },
      });
      upsertJob(job);
      setSelectedJobId(job.id);
      ensureSubscription(job.id);
      setTab('progress');
      await refreshJobs();
    },
    [ensureSubscription, refreshJobs, upsertJob]
  );

  const handleCancel = useCallback(async (jobId: string) => {
    await engine.cancelJob(jobId);
    const updated = await engine.getJob(jobId);
    if (updated) upsertJob(updated);
  }, [upsertJob]);

  const handleDownloadPack = useCallback(async (packId: string) => {
    await modelManager.downloadPack(packId);
  }, []);

  const handleVerifyPack = useCallback(async (packId: string) => {
    await modelManager.verifyPack(packId);
  }, []);

  const handleDeletePack = useCallback(async (packId: string) => {
    await modelManager.deletePack(packId);
  }, []);

  const selectedJob = jobs.find((j) => j.id === selectedJobId) ?? null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.kicker}>MOTF MOBILE</Text>
        <Text style={styles.title}>Separation Scaffold</Text>
        <Text style={styles.subtitle}>
          Dev scaffold with mock engine. No real audio processing or uploads.
        </Text>
      </View>

      <View style={styles.tabs}>
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <Pressable key={t.id} onPress={() => setTab(t.id)} style={[styles.tab, active && styles.tabActive]}>
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.body}>
        {tab === 'jobs' ? (
          <JobsScreen
            jobs={jobs}
            capabilities={capabilities}
            onCreateJob={handleCreateJob}
            onSelectJob={(id) => {
              setSelectedJobId(id);
            }}
            selectedJobId={selectedJobId}
            onGoToSettings={() => setTab('settings')}
          />
        ) : null}
        {tab === 'progress' ? <ProgressScreen job={selectedJob} onCancel={handleCancel} /> : null}
        {tab === 'player' ? <PlayerScreen job={selectedJob} /> : null}
        {tab === 'settings' ? (
          <SettingsScreen
            capabilities={capabilities}
            modelPacks={modelPacks}
            onDownloadPack={handleDownloadPack}
            onVerifyPack={handleVerifyPack}
            onDeletePack={handleDeletePack}
          />
        ) : null}
      </View>

      <Pressable style={styles.footer} onPress={() => Linking.openURL('https://cuesessions.com/?ref=motf')}>
        <Text style={styles.footerText}>
          Powered by <Text style={styles.footerBrand}>Cue</Text> · cuesessions.com
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, gap: 4 },
  kicker: { color: '#C8FF00', fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  title: { color: '#ffffff', fontSize: 28, fontWeight: '800' },
  subtitle: { color: '#9ca3af', fontSize: 13, lineHeight: 18 },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#0A0A0A', borderWidth: 1, borderColor: '#222222', alignItems: 'center' },
  tabActive: { backgroundColor: '#1A1A1A', borderColor: '#C8FF00' },
  tabText: { color: '#9ca3af', fontSize: 12, fontWeight: '700' },
  tabTextActive: { color: '#ffffff' },
  body: { flex: 1 },
  footer: { paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#222222' },
  footerText: { color: '#6b7280', fontSize: 11 },
  footerBrand: { color: '#C266FE', fontWeight: '800' },
});
