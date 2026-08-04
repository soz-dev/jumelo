import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SettingsBackHeader } from '../../src/components/SettingsChrome';
import { EmptyState, Screen, spacing, typography } from '../../src/design-system';
import { useTheme } from '../../src/context/ThemeContext';
import { listAdminActivity, type AdminActivity } from '../../src/lib/adminStore';

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function AdminActivityScreen() {
  const { colors } = useTheme();
  const [rows, setRows] = useState<AdminActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listAdminActivity());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => undefined);
    }, [load]),
  );

  return (
    <Screen>
      <SettingsBackHeader title="Journal admin" subtitle="AsyncStorage · 200 dernières" />
      {loading && rows.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />
          }
        >
          {rows.length === 0 ? (
            <EmptyState
              title="Aucune action"
              description="Ban, warn, dissolve, etc. apparaîtront ici."
              lottie="spark"
            />
          ) : (
            rows.map((r) => (
              <View
                key={r.id}
                style={[
                  styles.row,
                  { backgroundColor: colors.white, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.action, { color: colors.primaryDark }]}>{r.action}</Text>
                <Text style={[styles.detail, { color: colors.ink }]}>{r.detail}</Text>
                <Text style={[styles.when, { color: colors.inkFaint }]}>
                  {formatWhen(r.createdAt)}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  row: {
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: 4,
  },
  action: {
    fontFamily: typography.bodyBold.fontFamily,
    fontSize: 13,
    textTransform: 'uppercase',
  },
              detail: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
  },
  when: { ...typography.caption },
});
