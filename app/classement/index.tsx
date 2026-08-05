import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Atmosphere } from '../../src/components/Atmosphere';
import { safeBack } from '../../src/lib/navigation';
import { categories, getCategory, type UniverseId } from '../../src/constants/catalog';
import { useAuth } from '../../src/context/AuthContext';
import { useTeams } from '../../src/context/TeamsContext';
import { useTheme } from '../../src/context/ThemeContext';
import {
  Icon,
  fonts,
  radii,
  spacing,
  withHexAlpha,
} from '../../src/design-system';
import { getDuoScoresByTeamIds, emptyDuoScore, type DuoScore } from '../../src/lib/duoPoints';
import type { Team } from '../../src/lib/api/teams';

const MEDALS = ['🥇', '🥈', '🥉'];

type RankedTeam = { team: Team; score: DuoScore; position: number };

export default function ClassementScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { teams } = useTeams();
  const [scores, setScores] = useState<Map<string, DuoScore>>(new Map());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<UniverseId | 'all'>('all');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      const ids = teams.map((t) => t.id);
      getDuoScoresByTeamIds(ids)
        .then((map) => { if (active) setScores(map); })
        .catch(() => undefined)
        .finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }, [teams]),
  );

  const ranked: RankedTeam[] = useMemo(() => {
    const filtered = filter === 'all'
      ? teams
      : teams.filter((t) => t.universe === filter);
    return filtered
      .map((team) => ({ team, score: scores.get(team.id) ?? emptyDuoScore() }))
      .sort((a, b) => b.score.points - a.score.points)
      .slice(0, 50)
      .map((e, i) => ({ ...e, position: i + 1 }));
  }, [teams, scores, filter]);

  return (
    <Atmosphere variant="bold">
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => safeBack('/(tabs)/teams')} style={styles.back}>
            <Icon name="chevronLeft" size={22} color={colors.ink} weight="bold" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.primaryDark }]}>Classement</Text>
            <Text style={[styles.sub, { color: colors.inkMuted }]}>Top 50 jumelos</Text>
          </View>
        </View>

        {/* Filtres univers */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          <Pressable
            onPress={() => setFilter('all')}
            style={[
              styles.filterChip,
              filter === 'all'
                ? { backgroundColor: colors.primary, borderColor: colors.primary }
                : { backgroundColor: colors.white, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.filterLabel, { color: filter === 'all' ? '#fff' : colors.inkMuted }]}>
              Tous
            </Text>
          </Pressable>
          {categories.map((cat) => {
            const sel = filter === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() => setFilter(filter === cat.id ? 'all' : (cat.id as UniverseId))}
                style={[
                  styles.filterChip,
                  sel
                    ? { backgroundColor: cat.color, borderColor: cat.color }
                    : { backgroundColor: colors.white, borderColor: colors.border },
                ]}
              >
                <Text style={styles.filterEmoji}>{cat.emoji}</Text>
                <Text style={[styles.filterLabel, { color: sel ? '#fff' : colors.inkMuted }]}>
                  {cat.shortLabel}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
        ) : ranked.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.inkMuted }]}>
              Aucun jumelo avec des sessions pour l'instant.
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          >
            {/* Podium top 3 */}
            {ranked.length >= 1 && (
              <Animated.View entering={FadeInDown.duration(380)} style={styles.podiumWrap}>
                {/* #2 */}
                {ranked[1] ? <PodiumCard entry={ranked[1]} userId={user?.id} colors={colors} /> : <View style={{ flex: 1 }} />}
                {/* #1 — plus grand */}
                <PodiumCard entry={ranked[0]} userId={user?.id} colors={colors} hero />
                {/* #3 */}
                {ranked[2] ? <PodiumCard entry={ranked[2]} userId={user?.id} colors={colors} /> : <View style={{ flex: 1 }} />}
              </Animated.View>
            )}

            {/* Reste du classement */}
            {ranked.slice(3).map((entry, i) => (
              <Animated.View
                key={entry.team.id}
                entering={FadeInDown.delay(i * 30).duration(280)}
              >
                <Pressable
                  onPress={() => router.push(`/jumelo/${entry.team.id}`)}
                  style={[
                    styles.row,
                    {
                      backgroundColor: colors.white,
                      borderColor: entry.team.memberIds?.includes(user?.id ?? '')
                        ? withHexAlpha(colors.primary, 0.3)
                        : withHexAlpha(colors.border, 0.8),
                    },
                  ]}
                >
                  <Text style={[styles.pos, { color: colors.inkMuted }]}>
                    {entry.position}
                  </Text>
                  <View
                    style={[
                      styles.rankDot,
                      { backgroundColor: entry.score.rank.color },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowName, { color: colors.ink }]} numberOfLines={1}>
                      {entry.team.name}
                    </Text>
                    <Text style={[styles.rowMeta, { color: colors.inkMuted }]} numberOfLines={1}>
                      {getCategory(entry.team.universe as UniverseId)?.emoji ?? ''}{' '}
                      {entry.team.activity} · {entry.score.rank.displayName}
                    </Text>
                  </View>
                  <View style={[styles.xpBadge, { backgroundColor: withHexAlpha(entry.score.rank.color, 0.12), borderColor: withHexAlpha(entry.score.rank.color, 0.28) }]}>
                    <Text style={[styles.xpText, { color: entry.score.rank.color }]}>
                      {entry.score.points} XP
                    </Text>
                  </View>
                </Pressable>
              </Animated.View>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </Atmosphere>
  );
}

function PodiumCard({
  entry,
  userId,
  colors,
  hero = false,
}: {
  entry: RankedTeam;
  userId?: string;
  colors: ReturnType<typeof useTheme>['colors'];
  hero?: boolean;
}) {
  const isMe = entry.team.memberIds?.includes(userId ?? '');
  return (
    <Pressable
      onPress={() => router.push(`/jumelo/${entry.team.id}`)}
      style={[
        styles.podiumCard,
        hero && styles.podiumHero,
        {
          backgroundColor: colors.white,
          borderColor: isMe
            ? withHexAlpha(colors.primary, 0.4)
            : withHexAlpha(entry.score.rank.color, 0.28),
        },
      ]}
    >
      <Text style={styles.podiumMedal}>{MEDALS[entry.position - 1]}</Text>
      <View style={[styles.podiumRankDot, { backgroundColor: entry.score.rank.color }]} />
      <Text
        style={[styles.podiumName, { color: colors.ink, fontSize: hero ? 13 : 11 }]}
        numberOfLines={2}
      >
        {entry.team.name}
      </Text>
      <Text style={[styles.podiumRank, { color: entry.score.rank.color }]}>
        {entry.score.rank.displayName}
      </Text>
      <Text style={[styles.podiumXp, { color: colors.inkMuted }]}>
        {entry.score.points} XP
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  back: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.displaySemi,
    fontSize: 28,
    letterSpacing: -0.8,
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: 1,
  },
  filters: {
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  filterEmoji: { fontSize: 14 },
  filterLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  list: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    textAlign: 'center',
  },
  // Podium
  podiumWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: spacing.lg,
  },
  podiumCard: {
    flex: 1,
    alignItems: 'center',
    borderRadius: radii.xl,
    borderWidth: 1.5,
    padding: spacing.sm,
    gap: 4,
  },
  podiumHero: {
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  podiumMedal: { fontSize: 28, lineHeight: 34 },
  podiumRankDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  podiumName: {
    fontFamily: fonts.bodyBold,
    textAlign: 'center',
    lineHeight: 16,
  },
  podiumRank: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
  },
  podiumXp: {
    fontFamily: fonts.body,
    fontSize: 11,
  },
  // Rows
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  pos: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    width: 24,
    textAlign: 'center',
  },
  rankDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rowName: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  rowMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 1,
  },
  xpBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  xpText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
});
