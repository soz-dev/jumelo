import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SettingsBackHeader } from '../../src/components/SettingsChrome';
import { Button, EmptyState, Screen, spacing, typography } from '../../src/design-system';
import { useTheme } from '../../src/context/ThemeContext';
import {
  listAdminReports,
  seedDemoReports,
  setReportStatus,
  type AdminReport,
} from '../../src/lib/adminStore';

export default function AdminReportsScreen() {
  const { colors } = useTheme();
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReports(await listAdminReports());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => undefined);
    }, [load]),
  );

  const onSeed = async () => {
    setBusy(true);
    const rows = await seedDemoReports();
    setReports(rows);
    setBusy(false);
  };

  const pending = reports.filter((r) => r.status === 'pending');

  return (
    <Screen>
      <SettingsBackHeader
        title="Signalements"
        subtitle="File de modération MVP"
        fallback="/admin"
      />
      <View style={styles.topActions}>
        <Button
          label="Seed démo"
          icon="flask-outline"
          variant="secondary"
          onPress={onSeed}
          loading={busy}
        />
      </View>
      {loading && reports.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />
          }
        >
          <Text style={[styles.count, { color: colors.inkMuted }]}>
            {pending.length} en attente · {reports.length} total
          </Text>
          {reports.length === 0 ? (
            <EmptyState
              title="Aucun signalement"
              description="Utilise « Seed démo » pour peupler la file."
              lottie="spark"
            />
          ) : (
            reports.map((r) => (
              <View
                key={r.id}
                style={[
                  styles.card,
                  { backgroundColor: colors.white, borderColor: colors.border },
                ]}
              >
                <View style={styles.row}>
                  <Ionicons
                    name={
                      r.targetType === 'team'
                        ? 'people'
                        : r.targetType === 'user'
                          ? 'person'
                          : 'document-text'
                    }
                    size={20}
                    color={colors.primary}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.title, { color: colors.ink }]}>{r.targetLabel}</Text>
                    <Text style={[styles.meta, { color: colors.inkMuted }]}>
                      {r.reason}
                    </Text>
                    <Text style={[styles.meta, { color: colors.inkFaint }]}>
                      Par {r.reporterLabel} · {r.status}
                    </Text>
                  </View>
                </View>
                {r.status === 'pending' ? (
                  <View style={styles.actions}>
                    <Pressable
                      style={[styles.chip, { backgroundColor: colors.primarySoft }]}
                      onPress={async () => {
                        await setReportStatus(r.id, 'resolved');
                        await load();
                      }}
                    >
                      <Text style={{ color: colors.primaryDark, fontFamily: typography.bodyBold.fontFamily }}>
                        Résoudre
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.chip, { borderColor: colors.border, borderWidth: 1 }]}
                      onPress={async () => {
                        await setReportStatus(r.id, 'dismissed');
                        await load();
                      }}
                    >
                      <Text style={{ color: colors.ink, fontFamily: typography.bodyMd.fontFamily }}>
                        Ignorer
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topActions: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  count: { ...typography.overline, marginBottom: spacing.md },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  title: { fontFamily: typography.bodyBold.fontFamily, fontSize: 16 },
  meta: { ...typography.caption, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8 },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
});
