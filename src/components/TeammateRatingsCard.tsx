import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fonts, radii, spacing } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { withHexAlpha } from '../design-system';
import {
  getUserRatingSummary,
  type UserRatingSummary,
} from '../lib/teamSessions';

type Props = {
  userId: string;
  /** Compact = sans répartition (profil tab) */
  compact?: boolean;
};

function StarsRow({
  value,
  color,
  muted,
  size = 16,
}: {
  value: number;
  color: string;
  muted: string;
  size?: number;
}) {
  const filled = Math.round(value);
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons
          key={n}
          name={n <= filled ? 'star' : 'star-outline'}
          size={size}
          color={n <= filled ? color : muted}
        />
      ))}
    </View>
  );
}

export function TeammateRatingsCard({ userId, compact }: Props) {
  const { colors } = useTheme();
  const [summary, setSummary] = useState<UserRatingSummary | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getUserRatingSummary(userId).then((s) => {
        if (active) setSummary(s);
      });
      return () => {
        active = false;
      };
    }, [userId]),
  );

  if (!summary) return null;

  if (summary.count === 0) {
    if (compact) return null;
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: withHexAlpha(colors.primarySoft, 0.88),
            borderColor: withHexAlpha(colors.primary, 0.12),
          },
        ]}
      >
        <Ionicons name="people-outline" size={22} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.ink }]}>Avis coéquipiers</Text>
          <Text style={[styles.sub, { color: colors.inkMuted }]}>
            Pas encore d’avis après session — les notes restent anonymes.
          </Text>
        </View>
      </View>
    );
  }

  const maxDist = Math.max(...Object.values(summary.distribution), 1);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: withHexAlpha(colors.primarySoft, 0.88),
          borderColor: withHexAlpha(colors.primary, 0.12),
        },
        compact && styles.compact,
      ]}
    >
      <View style={styles.header}>
        <Ionicons name="star" size={22} color={colors.warning} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.ink }]}>Avis coéquipiers</Text>
          <Text style={[styles.sub, { color: colors.inkMuted }]}>
            Notes anonymes après session · {summary.count} avis
          </Text>
        </View>
        <View style={styles.avgBlock}>
          <Text style={[styles.avg, { color: colors.primary }]}>
            {summary.average.toFixed(1)}
          </Text>
          <Text style={[styles.avgMax, { color: colors.inkMuted }]}>/5</Text>
        </View>
      </View>

      <StarsRow
        value={summary.average}
        color={colors.warning}
        muted={colors.border}
        size={compact ? 14 : 18}
      />

      {!compact ? (
        <View style={styles.dist}>
          {([5, 4, 3, 2, 1] as const).map((n) => {
            const count = summary.distribution[n];
            const widthPct = (count / maxDist) * 100;
            return (
              <View key={n} style={styles.distRow}>
                <Text style={[styles.distLabel, { color: colors.inkMuted }]}>{n}</Text>
                <View style={[styles.distTrack, { backgroundColor: colors.primarySoft }]}>
                  <View
                    style={[
                      styles.distFill,
                      {
                        backgroundColor: colors.primary,
                        width: `${Math.max(count > 0 ? 8 : 0, widthPct)}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.distCount, { color: colors.inkMuted }]}>{count}</Text>
              </View>
            );
          })}
        </View>
      ) : null}

      {summary.topTags.length > 0 ? (
        <View style={styles.tags}>
          {summary.topTags.map((t) => (
            <View
              key={t.id}
              style={[styles.tag, { backgroundColor: colors.primarySoft }]}
            >
              <Text style={{ fontFamily: fonts.bodyMedium, color: colors.primaryDark, fontSize: 12 }}>
                {t.label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  compact: {
    marginTop: spacing.xl,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontFamily: fonts.bodyBold, fontSize: 15 },
  sub: { fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  avgBlock: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  avg: { fontFamily: fonts.display, fontSize: 28 },
  avgMax: { fontFamily: fonts.body, fontSize: 14 },
  starsRow: { flexDirection: 'row', gap: 2 },
  dist: { gap: 6, marginTop: 4 },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  distLabel: { fontFamily: fonts.bodyMedium, width: 12, fontSize: 12 },
  distTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  distFill: { height: '100%', borderRadius: 3 },
  distCount: { fontFamily: fonts.body, fontSize: 11, width: 18, textAlign: 'right' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  tag: {
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
