import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { getCategory, getSubCategory, type UniverseId } from '../../src/constants/catalog';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { Avatar, Icon, fonts, radii, spacing, withHexAlpha } from '../../src/design-system';
import { getDuoScoresByTeamIds, emptyDuoScore, type DuoScore } from '../../src/lib/duoPoints';
import { listTeams } from '../../src/lib/api/teams';
import { mockUsers } from '../../src/data/mock';
import { getSupabase } from '../../src/lib/supabase';
import { computeMatch } from '../../src/lib/matching';

// ─── Types ────────────────────────────────────────────────────────────────────

type MemberSnap = { id: string; name: string; photo?: string; color: string };

type RankedEntry = {
  id: string;
  name: string;
  universe: UniverseId;
  subCategoryId?: string | null;
  memberIds: string[];
  score: DuoScore;
  position: number;
  trend: number;
  members: MemberSnap[];
  /** Score de compatibilité 0–100 entre les deux membres. */
  compatPct?: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockUserMap = new Map(mockUsers.map((u) => [u.id, u]));

function compatForMembers(ids: string[]): number | undefined {
  const [a, b] = ids.map((id) => mockUserMap.get(id));
  if (!a || !b) return undefined;
  return computeMatch(a, b).score;
}

function trendColor(trend: number, up: string): string {
  if (trend > 0) return up;
  if (trend < 0) return '#EF4444';
  return '#F97316'; // orange = stable
}

async function fetchMemberSnaps(ids: string[]): Promise<Map<string, MemberSnap>> {
  const map = new Map<string, MemberSnap>();
  for (const u of mockUsers) {
    if (ids.includes(u.id)) {
      map.set(u.id, { id: u.id, name: u.name, photo: u.photo, color: u.avatarColor });
    }
  }
  const missing = ids.filter((id) => !map.has(id));
  if (missing.length > 0) {
    const sb = getSupabase();
    if (sb) {
      const { data } = await sb
        .from('profiles')
        .select('id, name, avatar_url, avatar_color')
        .in('id', missing);
      for (const row of (data ?? []) as Record<string, string>[]) {
        map.set(row.id, {
          id: row.id,
          name: row.name ?? '?',
          photo: row.avatar_url ?? undefined,
          color: row.avatar_color ?? '#7C5CFC',
        });
      }
    }
  }
  return map;
}

// ─── Mock data — 20 jumelos ───────────────────────────────────────────────────

type RawMock = {
  id: string;
  name: string;
  universe: UniverseId;
  subCategoryId: string;
  members: MemberSnap[];
  points: number;
  rating: number;
  sessions: number;
  trend: number;
  compat: number;
};

const M: Record<string, MemberSnap> = {
  lea:     { id: 'mk-lea',     name: 'Léa',       photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&crop=face', color: '#0186F0' },
  karim:   { id: 'mk-karim',   name: 'Karim',     photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop&crop=face', color: '#7C5CFC' },
  sara:    { id: 'mk-sara',    name: 'Sara',      photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&h=120&fit=crop&crop=face', color: '#3B82F6' },
  noah:    { id: 'mk-noah',    name: 'Noah',      photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&crop=face', color: '#68C3FF' },
  maya:    { id: 'mk-maya',    name: 'Maya',      photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop&crop=face', color: '#1FA97A' },
  maxime:  { id: 'mk-maxime',  name: 'Maxime',    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=face', color: '#F59E0B' },
  ahmed:   { id: 'mk-ahmed',   name: 'Ahmed',     photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&h=120&fit=crop&crop=face', color: '#F59E0B' },
  camille: { id: 'mk-camille', name: 'Camille',   photo: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=120&h=120&fit=crop&crop=face', color: '#EC4899' },
  tom:     { id: 'mk-tom',     name: 'Tom',       photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&h=120&fit=crop&crop=face', color: '#7C5CFC' },
  ines:    { id: 'mk-ines',    name: 'Inès',      photo: 'https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?w=120&h=120&fit=crop&crop=face', color: '#7C5CFC' },
  jad:     { id: 'mk-jad',     name: 'Jad',       photo: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=120&h=120&fit=crop&crop=face', color: '#0F8F8A' },
  amara:   { id: 'mk-amara',   name: 'Amara',     photo: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=120&h=120&fit=crop&crop=face', color: '#0F8F8A' },
  lucie:   { id: 'mk-lucie',   name: 'Lucie',     photo: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=120&h=120&fit=crop&crop=face', color: '#3B82F6' },
  romain:  { id: 'mk-romain',  name: 'Romain',    photo: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120&h=120&fit=crop&crop=face', color: '#3B82F6' },
  youssef: { id: 'mk-youssef', name: 'Youssef',   photo: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=120&h=120&fit=crop&crop=face', color: '#7C5CFC' },
  clara:   { id: 'mk-clara',   name: 'Clara',     photo: 'https://images.unsplash.com/photo-1542206395-9feb3edaa68d?w=120&h=120&fit=crop&crop=face', color: '#7C5CFC' },
  basile:  { id: 'mk-basile',  name: 'Basile',    photo: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=120&h=120&fit=crop&crop=face', color: '#F59E0B' },
  fatou:   { id: 'mk-fatou',   name: 'Fatoumata', photo: 'https://images.unsplash.com/photo-1548690312-e3b507d8c110?w=120&h=120&fit=crop&crop=face', color: '#F59E0B' },
  elisa:   { id: 'mk-elisa',   name: 'Elisa',     photo: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=120&h=120&fit=crop&crop=face', color: '#EC4899' },
  theo:    { id: 'mk-theo',    name: 'Théo',      photo: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=120&h=120&fit=crop&crop=face', color: '#EC4899' },
  anis:    { id: 'mk-anis',    name: 'Anis',      photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&h=120&fit=crop&crop=face', color: '#0F8F8A' },
  jade:    { id: 'mk-jade',    name: 'Jade',      photo: 'https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?w=120&h=120&fit=crop&crop=face', color: '#0F8F8A' },
  clement: { id: 'mk-clement', name: 'Clément',   photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&h=120&fit=crop&crop=face', color: '#7C5CFC' },
  nora:    { id: 'mk-nora',    name: 'Nora',      photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&h=120&fit=crop&crop=face', color: '#7C5CFC' },
  sasha:   { id: 'mk-sasha',   name: 'Sasha',     photo: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=120&h=120&fit=crop&crop=face', color: '#EC4899' },
  lou:     { id: 'mk-lou',     name: 'Lou',       photo: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=120&h=120&fit=crop&crop=face', color: '#EC4899' },
  ibra:    { id: 'mk-ibra',    name: 'Ibra',      photo: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=120&h=120&fit=crop&crop=face', color: '#0F8F8A' },
  leonie:  { id: 'mk-leonie',  name: 'Léonie',    photo: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=120&h=120&fit=crop&crop=face', color: '#0F8F8A' },
  chloe:   { id: 'mk-chloe',   name: 'Chloé',     photo: 'https://images.unsplash.com/photo-1542206395-9feb3edaa68d?w=120&h=120&fit=crop&crop=face', color: '#3B82F6' },
  antoine: { id: 'mk-antoine', name: 'Antoine',   photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&crop=face', color: '#3B82F6' },
  mia:     { id: 'mk-mia',     name: 'Mia',       photo: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=120&h=120&fit=crop&crop=face', color: '#F59E0B' },
  paul:    { id: 'mk-paul',    name: 'Paul',      photo: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=120&h=120&fit=crop&crop=face', color: '#F59E0B' },
  remi:    { id: 'mk-remi',    name: 'Rémi',      photo: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120&h=120&fit=crop&crop=face', color: '#7C5CFC' },
  salma:   { id: 'mk-salma',   name: 'Salma',     photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&crop=face', color: '#7C5CFC' },
  talia:   { id: 'mk-talia',   name: 'Talia',     photo: 'https://images.unsplash.com/photo-1548690312-e3b507d8c110?w=120&h=120&fit=crop&crop=face', color: '#0F8F8A' },
  hugo:    { id: 'mk-hugo',    name: 'Hugo',      photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop&crop=face', color: '#0F8F8A' },
  driss:   { id: 'mk-driss',   name: 'Driss',     photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=face', color: '#EC4899' },
  emilie:  { id: 'mk-emilie',  name: 'Emilie',    photo: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=120&h=120&fit=crop&crop=face', color: '#EC4899' },
  kim:     { id: 'mk-kim',     name: 'Kim',       photo: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=120&h=120&fit=crop&crop=face', color: '#7C5CFC' },
  axel:    { id: 'mk-axel',    name: 'Axel',      photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&h=120&fit=crop&crop=face', color: '#7C5CFC' },
};

const RAW_MOCKS: RawMock[] = [
  { id: 'mk-t1',  name: 'Jumelo Valorant Lyon',     universe: 'gaming',    subCategoryId: 'valorant',      members: [M.lea, M.karim],     points: 1847, rating: 4.6, sessions: 18, trend:  2, compat: 88 },
  { id: 'mk-t2',  name: 'Révisions Prépa',          universe: 'education', subCategoryId: 'maths',         members: [M.sara, M.noah],     points: 1720, rating: 4.8, sessions: 15, trend:  1, compat: 72 },
  { id: 'mk-t3',  name: 'Run Saône × Fitness',      universe: 'sports',    subCategoryId: 'running',       members: [M.maya, M.maxime],   points: 1654, rating: 4.2, sessions: 21, trend: -1, compat: 85 },
  { id: 'mk-t4',  name: 'Duo Piano Lyon',           universe: 'music',     subCategoryId: 'piano',         members: [M.ahmed, M.camille], points: 1589, rating: 4.5, sessions: 12, trend:  3, compat: 78 },
  { id: 'mk-t5',  name: 'Mid Lane Duo',             universe: 'gaming',    subCategoryId: 'lol',           members: [M.tom, M.ines],      points: 1510, rating: 4.0, sessions: 14, trend:  0, compat: 82 },
  { id: 'mk-t6',  name: 'Foot Mardi Lyon',          universe: 'sports',    subCategoryId: 'football',      members: [M.jad, M.amara],     points: 1488, rating: 3.9, sessions: 20, trend:  1, compat: 79 },
  { id: 'mk-t7',  name: 'Code & Build',             universe: 'education', subCategoryId: 'code',          members: [M.lucie, M.romain],  points: 1442, rating: 4.3, sessions: 11, trend: -2, compat: 76 },
  { id: 'mk-t8',  name: 'Apex Ranked Duo',          universe: 'gaming',    subCategoryId: 'apex',          members: [M.youssef, M.clara], points: 1390, rating: 3.8, sessions: 16, trend:  2, compat: 84 },
  { id: 'mk-t9',  name: 'Guitare Acoustique',       universe: 'music',     subCategoryId: 'guitare',       members: [M.basile, M.fatou],  points: 1355, rating: 4.4, sessions: 9,  trend:  0, compat: 74 },
  { id: 'mk-t10', name: 'Atelier Cuisine Créative', universe: 'hobbies',   subCategoryId: 'cuisine',       members: [M.elisa, M.theo],    points: 1312, rating: 4.1, sessions: 10, trend: -1, compat: 71 },
  { id: 'mk-t11', name: 'Jumelo Muscu × Salle',     universe: 'sports',    subCategoryId: 'muscu',         members: [M.anis, M.jade],     points: 1288, rating: 4.7, sessions: 22, trend:  4, compat: 86 },
  { id: 'mk-t12', name: 'Fortnite Squad',            universe: 'gaming',    subCategoryId: 'fortnite',      members: [M.clement, M.nora],  points: 1241, rating: 3.5, sessions: 13, trend: -3, compat: 78 },
  { id: 'mk-t13', name: 'Club Lecture Lyon',         universe: 'hobbies',   subCategoryId: 'lecture',       members: [M.sasha, M.lou],     points: 1208, rating: 4.6, sessions: 8,  trend:  0, compat: 80 },
  { id: 'mk-t14', name: 'Tennis & Padel Match',      universe: 'sports',    subCategoryId: 'tennis',        members: [M.ibra, M.leonie],   points: 1175, rating: 4.0, sessions: 17, trend:  1, compat: 75 },
  { id: 'mk-t15', name: 'Anglais Conversation',      universe: 'education', subCategoryId: 'anglais',       members: [M.chloe, M.antoine], points: 1130, rating: 4.2, sessions: 11, trend: -1, compat: 73 },
  { id: 'mk-t16', name: 'Duo Chant Scène',           universe: 'music',     subCategoryId: 'chant',         members: [M.mia, M.paul],      points: 1098, rating: 4.3, sessions: 7,  trend:  2, compat: 82 },
  { id: 'mk-t17', name: 'CS2 Ranked Lyon',           universe: 'gaming',    subCategoryId: 'cs2',           members: [M.remi, M.salma],    points: 1050, rating: 3.7, sessions: 15, trend:  0, compat: 77 },
  { id: 'mk-t18', name: 'Yoga & Bien-être',          universe: 'sports',    subCategoryId: 'yoga',          members: [M.talia, M.hugo],    points: 1020, rating: 4.5, sessions: 6,  trend: -2, compat: 70 },
  { id: 'mk-t19', name: 'Atelier Dessin × Art',      universe: 'hobbies',   subCategoryId: 'dessin',        members: [M.driss, M.emilie],  points: 985,  rating: 4.0, sessions: 8,  trend:  1, compat: 68 },
  { id: 'mk-t20', name: 'Rocket League Duo',         universe: 'gaming',    subCategoryId: 'rocket-league', members: [M.kim, M.axel],      points: 950,  rating: 3.6, sessions: 14, trend: -1, compat: 81 },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ClassementScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [entries, setEntries] = useState<RankedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'podium' | 'tableau'>('tableau');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);

      (async () => {
        // Mock entries — built at runtime so emptyDuoScore() is safe
        const mockEntries: Omit<RankedEntry, 'position'>[] = RAW_MOCKS.map((r) => ({
          id: r.id,
          name: r.name,
          universe: r.universe,
          subCategoryId: r.subCategoryId,
          memberIds: r.members.map((m) => m.id),
          score: {
            ...emptyDuoScore(),
            points: r.points,
            averageRating: r.rating,
            sessionsEnded: r.sessions,
            ratingCount: r.sessions,
            breakdown: { fromSessions: r.points, fromStars: 0, qualityBonus: 0 },
          },
          trend: r.trend,
          members: r.members,
          compatPct: r.compat,
        }));

        // Real teams from DB
        let realEntries: Omit<RankedEntry, 'position'>[] = [];
        try {
          const teams = await listTeams(user?.id);
          const teamIds = teams.map((t) => t.id);
          const memberIdsByTeam = new Map(teams.map((t) => [t.id, t.memberIds]));
          const allMemberIds = [...new Set(teams.flatMap((t) => t.memberIds))];
          const [scoresMap, snapMap] = await Promise.all([
            getDuoScoresByTeamIds(teamIds, memberIdsByTeam),
            fetchMemberSnaps(allMemberIds),
          ]);
          realEntries = teams.map((t) => ({
            id: t.id,
            name: t.name,
            universe: t.universe as UniverseId,
            subCategoryId: t.subCategoryId,
            memberIds: t.memberIds,
            score: scoresMap.get(t.id) ?? emptyDuoScore(),
            trend: Math.round((scoresMap.get(t.id)?.points ?? 0) % 7) - 3,
            compatPct: compatForMembers(t.memberIds),
            members: t.memberIds.map(
              (id) => snapMap.get(id) ?? { id, name: '?', color: '#7C5CFC' },
            ),
          }));
        } catch {
          // fall back to mocks only
        }

        // Merge: real entries first, then mocks to reach 20+
        const realIds = new Set(realEntries.map((e) => e.id));
        const combined = [
          ...realEntries,
          ...mockEntries.filter((e) => !realIds.has(e.id)),
        ]
          .sort((a, b) => b.score.points - a.score.points)
          .slice(0, 50)
          .map((e, i) => ({ ...e, position: i + 1 }));

        if (active) setEntries(combined);
      })()
        .catch(() => undefined)
        .finally(() => { if (active) setLoading(false); });

      return () => { active = false; };
    }, [user?.id]),
  );

  const champion = entries[0] ?? null;
  const podiumRest = entries.slice(1, 4);
  const tableRows = tab === 'tableau' ? entries : entries.slice(4);

  const champCat    = champion ? getCategory(champion.universe) : null;
  const champSubCat = champion ? getSubCategory(champion.universe, champion.subCategoryId ?? '') : null;
  const champColor  = champCat?.color ?? colors.primary;

  return (
    <Atmosphere variant="bold">
      <SafeAreaView style={styles.safe} edges={['top']}>

        {/* ─── Header ─── */}
        <View style={styles.header}>
          <Pressable onPress={() => safeBack('/(tabs)/teams')} style={styles.back}>
            <Icon name="chevronLeft" size={22} color={colors.ink} weight="bold" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: colors.primaryDark }]}>Top 50 Jumelos</Text>
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

        {/* ─── Tabs ─── */}
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

            {/* ─── Champion card ─── */}
            {champion ? (
              <Animated.View entering={FadeInDown.duration(360)}>
                <Pressable onPress={() => router.push(`/jumelo/${champion.id}`)}>
                  <LinearGradient
                    colors={['#0F1F3D', '#1A3366', '#0F1F3D']}
                    style={styles.champCard}
                  >
                    {/* Live + crown */}
                    <View style={styles.champTopRow}>
                      <View style={styles.liveChip}>
                        <View style={[styles.liveDot, { backgroundColor: '#4ADE80' }]} />
                        <Text style={styles.liveChipLabel}>EN DIRECT</Text>
                      </View>
                      <Text style={styles.crownEmoji}>👑</Text>
                    </View>

                    {/* Group avatar | name + subcat | members */}
                    <View style={styles.champMain}>
                      <View style={styles.champLeft}>
                        <Avatar name={champion.name} color={champColor} size={64} />
                        <View style={styles.rankBadge}>
                          <Text style={styles.rankBadgeText}>#1</Text>
                        </View>
                      </View>

                      <View style={styles.champCenter}>
                        <Text style={styles.champName} numberOfLines={2}>
                          {champion.name}
                        </Text>
                        <View style={[styles.subCatChip, { backgroundColor: withHexAlpha(champColor, 0.25) }]}>
                          <Text style={[styles.subCatText, { color: '#fff' }]}>
                            {champCat?.emoji}{' '}
                            {champSubCat?.label ?? champCat?.shortLabel ?? champion.universe}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.champRight}>
                        {champion.members.slice(0, 2).map((m) => (
                          <View key={m.id} style={styles.memberRow}>
                            {m.photo ? (
                              <Image source={{ uri: m.photo }} style={styles.memberPhoto} />
                            ) : (
                              <Avatar name={m.name} color={m.color} size={34} />
                            )}
                            <Text style={styles.memberName} numberOfLines={1}>
                              {m.name}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>

                    {/* Stats */}
                    <View style={styles.champStats}>
                      <View style={styles.statBox}>
                        <Text style={styles.statValue}>{champion.score.points}</Text>
                        <Text style={styles.statKey}>POINTS</Text>
                      </View>
                      <View style={[styles.statBox, styles.statBorder]}>
                        <Text style={styles.statValue}>
                          {champion.compatPct != null ? `${champion.compatPct}%` : '—'}
                        </Text>
                        <Text style={styles.statKey}>MATCH</Text>
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

            {/* ─── Podium horizontal #2–#4 ─── */}
            {podiumRest.length > 0 && tab === 'podium' ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.podiumRow}
              >
                {podiumRest.map((entry) => {
                  const c   = getCategory(entry.universe);
                  const sub = getSubCategory(entry.universe, entry.subCategoryId ?? '');
                  return (
                    <Pressable
                      key={entry.id}
                      onPress={() => router.push(`/jumelo/${entry.id}`)}
                      style={[
                        styles.podiumCard,
                        { backgroundColor: colors.white, borderColor: withHexAlpha(colors.border, 0.7) },
                      ]}
                    >
                      <Text style={[styles.podiumPos, { color: colors.inkFaint }]}>#{entry.position}</Text>
                      <Avatar name={entry.name} color={c?.color ?? colors.primary} size={40} />
                      <Text style={[styles.podiumName, { color: colors.ink }]} numberOfLines={2}>
                        {entry.name}
                      </Text>
                      <Text style={[styles.podiumSub, { color: c?.color ?? colors.inkMuted }]}>
                        {c?.emoji} {sub?.label ?? c?.shortLabel ?? entry.universe}
                      </Text>
                      <View style={styles.podiumMembers}>
                        {entry.members.slice(0, 2).map((m) =>
                          m.photo ? (
                            <Image key={m.id} source={{ uri: m.photo }} style={styles.podiumMemberPhoto} />
                          ) : (
                            <Avatar key={m.id} name={m.name} color={m.color} size={22} />
                          ),
                        )}
                      </View>
                      <Text style={[styles.podiumPts, { color: colors.primary }]}>
                        {entry.score.points} pts
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}

            {/* ─── Table ─── */}
            <View style={[styles.table, { backgroundColor: colors.white, borderColor: withHexAlpha(colors.border, 0.6) }]}>
              <View style={[styles.tableHead, { borderBottomColor: withHexAlpha(colors.border, 0.7) }]}>
                <Text style={[styles.thPos,    { color: colors.inkMuted }]}>#</Text>
                <Text style={[styles.thJumelo, { color: colors.inkMuted }]}>JUMELO</Text>
                <Text style={[styles.thNum,    { color: colors.inkMuted }]}>MATCH</Text>
                <Text style={[styles.thNum,    { color: colors.inkMuted }]}>SÉRIE</Text>
                <Text style={[styles.thPts,    { color: colors.inkMuted }]}>PTS</Text>
              </View>

              {tableRows.length === 0 ? (
                <Text style={[styles.empty, { color: colors.inkMuted }]}>Aucun jumelo pour l'instant</Text>
              ) : null}

              {tableRows.map((entry, i) => {
                const isMe = entry.memberIds.includes(user?.id ?? '');
                const c    = getCategory(entry.universe);
                const sub  = getSubCategory(entry.universe, entry.subCategoryId ?? '');
                const compat = entry.compatPct;
                const serie = entry.score.sessionsEnded;
                return (
                  <Animated.View key={entry.id} entering={FadeInDown.delay(Math.min(i, 15) * 20).duration(240)}>
                    <Pressable
                      onPress={() => router.push(`/jumelo/${entry.id}`)}
                      style={[
                        styles.tableRow,
                        i < tableRows.length - 1 && {
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: withHexAlpha(colors.border, 0.5),
                        },
                        isMe && { backgroundColor: withHexAlpha(colors.primary, 0.04) },
                      ]}
                    >
                      {/* Position */}
                      <View style={styles.posCell}>
                        <Text style={[styles.posNum, { color: entry.position <= 3 ? colors.primary : colors.inkMuted }]}>
                          {entry.position}
                        </Text>
                      </View>

                      {/* Jumelo: group avatar + name + subcat + member micro-avatars */}
                      <View style={styles.jumeloCell}>
                        <Avatar name={entry.name} color={c?.color ?? colors.primary} size={36} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.rowName, { color: colors.ink }]} numberOfLines={1}>
                            {entry.name}
                          </Text>
                          <View style={styles.rowMeta}>
                            <Text style={[styles.rowCat, { color: c?.color ?? colors.inkMuted }]}>
                              {c?.emoji} {sub?.label ?? c?.shortLabel ?? entry.universe}
                            </Text>
                            <View style={styles.memberAvatars}>
                              {entry.members.slice(0, 2).map((m) =>
                                m.photo ? (
                                  <Image key={m.id} source={{ uri: m.photo }} style={styles.tinyPhoto} />
                                ) : (
                                  <Avatar key={m.id} name={m.name} color={m.color} size={16} />
                                ),
                              )}
                            </View>
                          </View>
                        </View>
                      </View>

                      {/* Match % */}
                      <View style={styles.numCell}>
                        <Text style={[styles.numVal, { color: compat != null && compat >= 80 ? colors.primary : colors.ink }]}>
                          {compat != null ? `${compat}%` : '—'}
                        </Text>
                        {compat != null ? (
                          <View style={[styles.pctBar, { backgroundColor: withHexAlpha(colors.primary, 0.1) }]}>
                            <View style={[styles.pctFill, { width: `${compat}%` as `${number}%`, backgroundColor: colors.primary }]} />
                          </View>
                        ) : null}
                      </View>

                      {/* Série */}
                      <View style={styles.numCell}>
                        {serie > 0
                          ? <Text style={[styles.numVal, { color: colors.ink }]}>🔥{serie}</Text>
                          : <Text style={[styles.numVal, { color: colors.inkFaint }]}>—</Text>}
                      </View>

                      {/* Points + trend */}
                      <View style={styles.ptsCell}>
                        <Text style={[styles.ptsVal, { color: colors.ink }]}>{entry.score.points}</Text>
                        <Text style={[styles.trend, { color: trendColor(entry.trend, colors.primary) }]}>
                          {entry.trend > 0
                            ? `▲${entry.trend}`
                            : entry.trend < 0
                            ? `▼${Math.abs(entry.trend)}`
                            : '—'}
                        </Text>
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const PHOTO_SIZE = 36;

const styles = StyleSheet.create({
  safe:     { flex: 1 },
  header:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  back:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title:    { fontFamily: fonts.displaySemi, fontSize: 24, letterSpacing: -0.6 },
  liveBadge:{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  liveDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444' },
  liveLabel:{ fontFamily: fonts.bodyBold, fontSize: 11, color: '#EF4444', letterSpacing: 0.5 },
  sub:      { fontFamily: fonts.body, fontSize: 12, marginTop: 1 },

  tabs:    { flexDirection: 'row', marginHorizontal: spacing.lg, marginTop: spacing.sm, borderRadius: radii.lg, borderWidth: 1, padding: 3, gap: 3 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: radii.md },
  tabLabel:{ fontFamily: fonts.bodyBold, fontSize: 14 },
  scroll:  { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },

  // Champion card
  champCard:     { borderRadius: radii.xl, padding: spacing.lg, overflow: 'hidden', gap: spacing.sm },
  champTopRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  liveChip:      { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(74,222,128,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  liveChipLabel: { fontFamily: fonts.bodyBold, fontSize: 11, color: '#4ADE80', letterSpacing: 0.5 },
  crownEmoji:    { fontSize: 22 },
  champMain:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.xs },
  champLeft:     { alignItems: 'center' },
  rankBadge:     { position: 'absolute', bottom: -4, right: -6, backgroundColor: '#FFD700', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2 },
  rankBadgeText: { fontFamily: fonts.bodyBold, fontSize: 10, color: '#0F1F3D' },
  champCenter:   { flex: 1, gap: 6 },
  champName:     { fontFamily: fonts.displaySemi, fontSize: 17, color: '#fff', letterSpacing: -0.3, lineHeight: 22 },
  subCatChip:    { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  subCatText:    { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.3 },
  champRight:    { alignItems: 'flex-end', gap: 10 },
  memberRow:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberPhoto:   { width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: PHOTO_SIZE / 2, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  memberName:    { fontFamily: fonts.bodyBold, fontSize: 12, color: 'rgba(255,255,255,0.9)', maxWidth: 60 },
  champStats:    { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radii.lg, overflow: 'hidden', marginTop: spacing.xs },
  statBox:       { flex: 1, alignItems: 'center', paddingVertical: 12 },
  statBorder:    { borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  statValue:     { fontFamily: fonts.displaySemi, fontSize: 18, color: '#fff' },
  statKey:       { fontFamily: fonts.body, fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2, letterSpacing: 0.4 },

  // Podium horizontal
  podiumRow:         { gap: 10, paddingRight: spacing.sm },
  podiumCard:        { width: 140, borderRadius: radii.xl, borderWidth: 1, padding: spacing.md, alignItems: 'center', gap: 6 },
  podiumPos:         { fontFamily: fonts.bodyBold, fontSize: 12 },
  podiumName:        { fontFamily: fonts.bodyBold, fontSize: 13, textAlign: 'center', lineHeight: 18 },
  podiumSub:         { fontFamily: fonts.body, fontSize: 11, textAlign: 'center' },
  podiumMembers:     { flexDirection: 'row', gap: 4 },
  podiumMemberPhoto: { width: 22, height: 22, borderRadius: 11 },
  podiumPts:         { fontFamily: fonts.bodyBold, fontSize: 13 },

  // Table
  table:      { borderRadius: radii.xl, borderWidth: 1, overflow: 'hidden' },
  tableHead:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 10, borderBottomWidth: 1, gap: 4 },
  thPos:      { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.4, width: 28 },
  thJumelo:   { flex: 1, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.4 },
  thNum:      { width: 50, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.4, textAlign: 'center' },
  thPts:      { width: 56, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.4, textAlign: 'right' },
  tableRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 10, gap: 4 },
  posCell:    { width: 28, alignItems: 'center' },
  posNum:     { fontFamily: fonts.bodyBold, fontSize: 13 },
  jumeloCell: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowName:    { fontFamily: fonts.bodyBold, fontSize: 13 },
  rowMeta:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  rowCat:     { fontFamily: fonts.body, fontSize: 11 },
  memberAvatars: { flexDirection: 'row', gap: 2 },
  tinyPhoto:  { width: 16, height: 16, borderRadius: 8 },
  numCell:    { width: 50, alignItems: 'center', gap: 3 },
  numVal:     { fontFamily: fonts.bodyBold, fontSize: 12 },
  pctBar:     { width: 32, height: 3, borderRadius: 2, overflow: 'hidden' },
  pctFill:    { height: '100%', borderRadius: 2 },
  ptsCell:    { width: 56, alignItems: 'flex-end' },
  ptsVal:     { fontFamily: fonts.displaySemi, fontSize: 14 },
  trend:      { fontFamily: fonts.bodyBold, fontSize: 10, marginTop: 1 },
  empty:      { fontFamily: fonts.body, fontSize: 14, textAlign: 'center', paddingVertical: spacing.xl },
});
