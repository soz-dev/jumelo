import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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
import { getCategory, type UniverseId } from '../../src/constants/catalog';
import { useAuth } from '../../src/context/AuthContext';
import { useTeams } from '../../src/context/TeamsContext';
import { useTheme } from '../../src/context/ThemeContext';
import { Avatar, Icon, fonts, radii, spacing, withHexAlpha } from '../../src/design-system';
import { getDuoScoresByTeamIds, emptyDuoScore, type DuoScore } from '../../src/lib/duoPoints';
import type { Team } from '../../src/lib/api/teams';

type RankedTeam = { team: Team; score: DuoScore; position: number; trend: number };

function winPct(score: DuoScore): number {
  if (score.sessionsEnded === 0) return 0;
  return Math.round((score.averageRating / 5) * 100);
}

function trendColor(trend: number, primary: string, accent: string): string {
  if (trend > 0) return primary;
  if (trend < 0) return accent;
  return '#9CA3AF';
}

export default function ClassementScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { teams } = useTeams();
  const [scores, setScores] = useState<Map<string, DuoScore>>(new Map());
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'podium' | 'tableau'>('tableau');

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
    return [...teams]
      .map((team) => ({ team, score: scores.get(team.id) ?? emptyDuoScore() }))
      .sort((a, b) => b.score.points - a.score.points)
      .slice(0, 50)
      .map((e, i) => ({ ...e, position: i + 1, trend: 0 }));
  }, [teams, scores]);

  const champion = ranked[0] ?? null;
  const podiumRest = ranked.slice(1, 4);
  const tableRows = tab === 'tableau' ? ranked : ranked.slice(4);
  const cat = champion ? getCategory(champion.team.universe as UniverseId) : null;
  const universeColor = cat?.color ?? colors.primary;

  return (
    <Atmosphere variant="bold">
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => safeBack('/(tabs)/teams')} style={styles.back}>
            <Icon name="chevronLeft" size={22} color={colors.ink} weight="bold" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: colors.primaryDark }]}>Top 50 Binômes</Text>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveLabel}>LIVE</Text>
              </View>
            </View>
            <Text style={[styles.sub, { color: colors.inkMuted }]}>
              Classement en direct · mis à jour à l'instant
            </Text>
          </View>
        </View>

        <View style={[styles.tabs, { backgroundColor: colors.white, borderColor: colors.border }]}>
          {(['podium', 'tableau'] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tabItem, tab === t && { backgroundColor: colors.primaryDark }]}
            >
              <Text style={[styles.tabLabel, { color: tab === t ? '#fff' : colors.inkMuted }]}>
                {t === 'podium' ? 'Podium' : 'Tableau'}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
        ) : (
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

            {champion ? (
              <Animated.View entering={FadeInDown.duration(360)}>
                <Pressable onPress={() => router.push(`/jumelo/${champion.team.id}`)}>
                  <LinearGradient
                    colors={['#0F1F3D', '#1A3366', '#0F1F3D']}
                    style={styles.championCard}
                  >
                    <View style={styles.championTop}>
                      <View style={styles.liveChip}>
                        <View style={[styles.liveDot, { backgroundColor: '#4ADE80' }]} />
                        <Text style={styles.liveChipLabel}>EN DIRECT</Text>
                      </View>
                      <Text style={styles.crownEmoji}>👑</Text>
                    </View>
                    <Avatar name={champion.team.name} color={universeColor} size={52} />
                    <Text style={styles.championSub}>CHAMPION · #1</Text>
                    <Text style={styles.championName}>{champion.team.name}</Text>
                    <View style={styles.championStats}>
                      <View style={styles.statBox}>
                        <Text style={styles.statValue}>{champion.score.points}</Text>
                        <Text style={styles.statKey}>POINTS</Text>
                      </View>
                      <View style={[styles.statBox, styles.statBorder]}>
                        <Text style={styles.statValue}>{winPct(champion.score)}%</Text>
                        <Text style={styles.statKey}>VICTOIRES</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statValue}>🔥 {champion.score.sessionsEnded}</Text>
                        <Text style={styles.statKey}>SÉRIE</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </Pressable>
              </Animated.View>
            ) : null}

            {podiumRest.length > 0 && tab === 'podium' ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.podiumRow}>
                {podiumRest.map((entry) => {
                  const c = getCategory(entry.team.universe as UniverseId);
                  return (
                    <Pressable
                      key={entry.team.id}
                      onPress={() => router.push(`/jumelo/${entry.team.id}`)}
                      style={[styles.podiumCard, { backgroundColor: colors.white, borderColor: withHexAlpha(colors.border, 0.7) }]}
                    >
                      <Text style={[styles.podiumPos, { color: colors.inkFaint }]}>#{entry.position}</Text>
                      <Avatar name={entry.team.name} color={c?.color ?? colors.primary} size={40} />
                      <Text style={[styles.podiumName, { color: colors.ink }]} numberOfLines={2}>{entry.team.name}</Text>
                      <Text style={[styles.podiumPts, { color: colors.primary }]}>{entry.score.points} pts</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}

            <View style={[styles.table, { backgroundColor: colors.white, borderColor: withHexAlpha(colors.border, 0.6) }]}>
              <View style={[styles.tableHead, { borderBottomColor: withHexAlpha(colors.border, 0.7) }]}>
                <Text style={[styles.thPos, { color: colors.inkMuted }]}>#</Text>
                <Text style={[styles.thBinome, { color: colors.inkMuted }]}>BINÔME</Text>
                <Text style={[styles.thNum, { color: colors.inkMuted }]}>V%</Text>
                <Text style={[styles.thNum, { color: colors.inkMuted }]}>SÉRIE</Text>
                <Text style={[styles.thPts, { color: colors.inkMuted }]}>PTS</Text>
              </View>

              {tableRows.length === 0 ? (
                <Text style={[styles.empty, { color: colors.inkMuted }]}>Aucun binôme pour l'instant</Text>
              ) : null}

              {tableRows.map((entry, i) => {
                const isMe = entry.team.memberIds?.includes(user?.id ?? '');
                const c = getCategory(entry.team.universe as UniverseId);
                const vPct = winPct(entry.score);
                const serie = entry.score.sessionsEnded;
                return (
                  <Animated.View key={entry.team.id} entering={FadeInDown.delay(Math.min(i, 12) * 25).duration(260)}>
                    <Pressable
                      onPress={() => router.push(`/jumelo/${entry.team.id}`)}
                      style={[
                        styles.tableRow,
                        i < tableRows.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: withHexAlpha(colors.border, 0.5) },
                        isMe && { backgroundColor: withHexAlpha(colors.primary, 0.04) },
                      ]}
                    >
                      <View style={styles.posCell}>
                        <Text style={[styles.posNum, { color: entry.position <= 3 ? colors.primary : colors.inkMuted }]}>
                          {entry.position}
                        </Text>
                      </View>
                      <View style={styles.binomeCell}>
                        <Avatar name={entry.team.name} color={c?.color ?? colors.primary} size={32} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.rowName, { color: colors.ink }]} numberOfLines={1}>{entry.team.name}</Text>
                          <Text style={[styles.rowCat, { color: c?.color ?? colors.inkMuted }]} numberOfLines={1}>
                            {c?.emoji ?? ''} {c?.shortLabel ?? entry.team.universe}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.numCell}>
                        <Text style={[styles.numVal, { color: colors.ink }]}>{vPct}</Text>
                        <View style={[styles.pctBar, { backgroundColor: withHexAlpha(colors.primary, 0.1) }]}>
                          <View style={[styles.pctFill, { width: `${Math.max(vPct, 2)}%` as any, backgroundColor: colors.primary }]} />
                        </View>
                      </View>
                      <View style={styles.numCell}>
                        {serie > 0
                          ? <Text style={[styles.numVal, { color: colors.ink }]}>🔥 {serie}</Text>
                          : <Text style={[styles.numVal, { color: colors.inkFaint }]}>—</Text>}
                      </View>
                      <View style={styles.ptsCell}>
                        <Text style={[styles.ptsVal, { color: colors.ink }]}>{entry.score.points}</Text>
                        {entry.trend !== 0
                          ? <Text style={[styles.trend, { color: trendColor(entry.trend, colors.primary, colors.accent) }]}>
                              {entry.trend > 0 ? `▲${entry.trend}` : `▼${Math.abs(entry.trend)}`}
                            </Text>
                          : <Text style={[styles.trend, { color: colors.inkFaint }]}>—</Text>}
                      </View>
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontFamily: fonts.displaySemi, fontSize: 24, letterSpacing: -0.6 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444' },
  liveLabel: { fontFamily: fonts.bodyBold, fontSize: 11, color: '#EF4444', letterSpacing: 0.5 },
  sub: { fontFamily: fonts.body, fontSize: 12, marginTop: 1 },
  tabs: { flexDirection: 'row', marginHorizontal: spacing.lg, marginTop: spacing.sm, borderRadius: radii.lg, borderWidth: 1, padding: 3, gap: 3 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: radii.md },
  tabLabel: { fontFamily: fonts.bodyBold, fontSize: 14 },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  championCard: { borderRadius: radii.xl, padding: spacing.lg, overflow: 'hidden', gap: 6 },
  championTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  liveChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(74,222,128,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  liveChipLabel: { fontFamily: fonts.bodyBold, fontSize: 11, color: '#4ADE80', letterSpacing: 0.5 },
  crownEmoji: { fontSize: 22 },
  championSub: { fontFamily: fonts.bodyBold, fontSize: 11, color: 'rgba(255,255,255,0.55)', letterSpacing: 0.8, marginTop: 8 },
  championName: { fontFamily: fonts.displaySemi, fontSize: 26, color: '#fff', letterSpacing: -0.5, marginBottom: spacing.sm },
  championStats: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radii.lg, overflow: 'hidden' },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  statValue: { fontFamily: fonts.displaySemi, fontSize: 18, color: '#fff' },
  statKey: { fontFamily: fonts.body, fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2, letterSpacing: 0.4 },
  podiumRow: { gap: 10, paddingRight: spacing.sm },
  podiumCard: { width: 130, borderRadius: radii.xl, borderWidth: 1, padding: spacing.md, alignItems: 'center', gap: 6 },
  podiumPos: { fontFamily: fonts.bodyBold, fontSize: 12 },
  podiumName: { fontFamily: fonts.bodyBold, fontSize: 13, textAlign: 'center', lineHeight: 18 },
  podiumPts: { fontFamily: fonts.bodyBold, fontSize: 13 },
  table: { borderRadius: radii.xl, borderWidth: 1, overflow: 'hidden' },
  tableHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 10, borderBottomWidth: 1, gap: 4 },
  thPos: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.4, width: 28 },
  thBinome: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.4 },
  thNum: { width: 52, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.4, textAlign: 'center' },
  thPts: { width: 56, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.4, textAlign: 'right' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 10, gap: 4 },
  posCell: { width: 28, alignItems: 'center' },
  posNum: { fontFamily: fonts.bodyBold, fontSize: 13 },
  binomeCell: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowName: { fontFamily: fonts.bodyBold, fontSize: 13 },
  rowCat: { fontFamily: fonts.body, fontSize: 11, marginTop: 1 },
  numCell: { width: 52, alignItems: 'center', gap: 3 },
  numVal: { fontFamily: fonts.bodyBold, fontSize: 12 },
  pctBar: { width: 32, height: 3, borderRadius: 2, overflow: 'hidden' },
  pctFill: { height: '100%', borderRadius: 2 },
  ptsCell: { width: 56, alignItems: 'flex-end' },
  ptsVal: { fontFamily: fonts.displaySemi, fontSize: 14 },
  trend: { fontFamily: fonts.bodyBold, fontSize: 10, marginTop: 1 },
  empty: { fontFamily: fonts.body, fontSize: 14, textAlign: 'center', paddingVertical: spacing.xl },
});
