import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Atmosphere } from '../../src/components/Atmosphere';
import { BrandLogo } from '../../src/components/BrandLogo';
import { ThemeSwitcherButton } from '../../src/components/ThemeSwitcher';
import { TeamLobbyCard } from '../../src/components/TeamLobbyCard';
import { UniverseId, categories } from '../../src/constants/catalog';
import { useTheme } from '../../src/context/ThemeContext';
import { useTeams } from '../../src/context/TeamsContext';
import {
  EmptyState,
  HeaderRow,
  Icon,
  elevation,
  fonts,
  radii,
  spacing,
  themeBrandColors,
  themeGradientAngles,
  withHexAlpha,
} from '../../src/design-system';
import { ensureTeamChat } from '../../src/lib/api/teamChats';
import type { TeamMembershipState } from '../../src/lib/api/teams';
import {
  getDuoScoresByTeamIds,
  type DuoScore,
} from '../../src/lib/duoPoints';
import { isDuoCapacity } from '../../src/lib/teamKind';

export default function TeamsScreen() {
  const { colors } = useTheme();
  const { teams, loading, refresh, getMembership, requestToJoin } = useTeams();
  const [query, setQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState<'all' | 'duo' | 'groupe'>('all');
  const [filter, setFilter] = useState<UniverseId | 'all'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [duoScores, setDuoScores] = useState<Map<string, DuoScore>>(new Map());

  useFocusEffect(
    useCallback(() => {
      refresh().catch(() => undefined);
    }, [refresh]),
  );

  const jumelos = useMemo(
    () => teams.filter((t) => {
      if (formatFilter === 'duo') return isDuoCapacity(t.capacity);
      if (formatFilter === 'groupe') return !isDuoCapacity(t.capacity);
      return true;
    }),
    [teams, formatFilter],
  );

  useEffect(() => {
    let active = true;
    const ids = jumelos.map((t) => t.id);
    if (ids.length === 0) {
      setDuoScores(new Map());
      return;
    }
    getDuoScoresByTeamIds(ids)
      .then((map) => {
        if (active) setDuoScores(map);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [jumelos]);

  const filtered = useMemo(
    () =>
      jumelos.filter((team) => {
        const matchesFilter = filter === 'all' || team.universe === filter;
        const q = query.trim().toLowerCase();
        const matchesQuery =
          !q ||
          team.name.toLowerCase().includes(q) ||
          team.activity.toLowerCase().includes(q);
        return matchesFilter && matchesQuery;
      }),
    [filter, jumelos, query],
  );

  const onJoinPress = async (teamId: string, state: TeamMembershipState) => {
    if (state === 'owner') {
      router.push({ pathname: '/team/create', params: { editId: teamId } });
      return;
    }
    if (state === 'pending') {
      router.push(`/jumelo/${teamId}`);
      return;
    }
    if (state === 'member') {
      const team = teams.find((t) => t.id === teamId);
      if (team) {
        setBusyId(teamId);
        try {
          const chat = await ensureTeamChat(team);
          router.push(`/chat/${chat.id}`);
        } finally {
          setBusyId(null);
        }
        return;
      }
      router.push(`/jumelo/${teamId}`);
      return;
    }
    setBusyId(teamId);
    const result = await requestToJoin(teamId);
    setBusyId(null);
    if (!result.ok) {
      Alert.alert('Impossible', result.error);
      return;
    }
    if (result.mode === 'requested') {
      Alert.alert(
        'Demande envoyée',
        'En attente de réponse du chef. Tu pourras rejoindre après approbation.',
      );
      return;
    }
    const team = teams.find((t) => t.id === teamId);
    if (team) {
      setBusyId(teamId);
      try {
        const chat = await ensureTeamChat(team);
        router.push(`/chat/${chat.id}`);
      } finally {
        setBusyId(null);
      }
      return;
    }
    router.push(`/jumelo/${teamId}`);
  };

  const createJumelo = () => router.push('/team/create');
  const empty = !loading && filtered.length === 0;

  return (
    <Atmosphere variant="bold">
      <SafeAreaView style={[styles.safe, { backgroundColor: 'transparent' }]} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <HeaderRow
            title="Lobby jumelos"
            subtitle="Trouve un partenaire ou lance le tien"
            right={
              <View style={styles.actions}>
                <Pressable
                  onPress={() => router.push('/classement')}
                  style={[styles.trophyBtn, { backgroundColor: colors.white, borderColor: colors.border }]}
                  accessibilityLabel="Classement"
                >
                  <Icon name="trophy" size={18} color={colors.primary} weight="bold" />
                </Pressable>
                <BrandLogo size={34} />
                <ThemeSwitcherButton />
              </View>
            }
          />

          <Animated.View entering={FadeInDown.duration(320)}>
            <Pressable
              onPress={createJumelo}
              style={[styles.ctaPress, elevation.glow(colors.primary)]}
            >
              <LinearGradient
                colors={[...themeBrandColors(colors)]}
                start={themeGradientAngles.brand.start}
                end={themeGradientAngles.brand.end}
                style={styles.ctaBanner}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.2)', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.ctaIcon}>
                  <Icon name="social" size={22} color="#fff" weight="bold" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ctaEyebrow}>Nouveau</Text>
                  <Text style={styles.ctaTitle}>Créer un jumelo</Text>
                  <Text style={styles.ctaSub}>
                    Choisis une activité et trouve ta personne
                  </Text>
                </View>
                <Icon name="chevronRight" size={18} color="#fff" weight="bold" />
              </LinearGradient>
            </Pressable>
          </Animated.View>

          <View
            style={[
              styles.search,
              {
                backgroundColor: withHexAlpha(colors.white, 0.78),
                borderColor: withHexAlpha(colors.border, 0.95),
              },
            ]}
          >
            <Icon name="search" size={18} color={colors.inkFaint} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Rechercher un jumelo, un jeu…"
              placeholderTextColor={colors.inkFaint}
              style={[styles.searchInput, { color: colors.ink }]}
            />
          </View>

          <View style={[styles.segment, { backgroundColor: withHexAlpha(colors.ink, 0.07) }]}>
            {(['all', 'duo', 'groupe'] as const).map((f) => {
              const active = formatFilter === f;
              return (
                <Pressable
                  key={f}
                  onPress={() => setFormatFilter(f)}
                  style={[
                    styles.segItem,
                    active && { backgroundColor: colors.white, ...shadowSm },
                  ]}
                >
                  <Text style={[styles.segLabel, { color: active ? colors.ink : colors.inkMuted }]}>
                    {f === 'all' ? 'Tout' : f === 'duo' ? 'Duo' : 'Groupes'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filters}
          >
            {categories.map((cat) => {
              const sel = filter === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setFilter(filter === cat.id ? 'all' : cat.id)}
                  style={[
                    styles.catChip,
                    sel
                      ? { backgroundColor: cat.color, borderColor: cat.color }
                      : { backgroundColor: colors.white, borderColor: colors.border },
                  ]}
                >
                  <Text style={styles.catEmoji}>{cat.emoji}</Text>
                  <Text style={[styles.catLabel, { color: sel ? '#fff' : colors.inkMuted }]}>
                    {cat.shortLabel}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {loading && jumelos.length === 0 ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
          ) : null}

          {empty ? (
            <EmptyState
              title="Aucun jumelo"
              description="Crée le tien — une activité, deux personnes."
              lottie="bolt"
              actionLabel="Créer un jumelo"
              onAction={createJumelo}
            />
          ) : null}

          {filtered.map((team, index) => {
            const state = getMembership(team.id);
            return (
              <Animated.View
                key={team.id}
                entering={FadeInDown.delay(Math.min(index, 6) * 40).duration(300)}
              >
                <TeamLobbyCard
                  team={team}
                  state={state}
                  busy={busyId === team.id}
                  duoRank={duoScores.get(team.id)?.rank ?? null}
                  onJoin={() => onJoinPress(team.id, state)}
                  onDetails={() => router.push(`/jumelo/${team.id}`)}
                />
              </Animated.View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </Atmosphere>
  );
}

const shadowSm = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.08,
  shadowRadius: 3,
  elevation: 2,
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  actions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  trophyBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPress: {
    marginTop: spacing.md,
    borderRadius: radii.xl,
  },
  ctaBanner: {
    borderRadius: radii.xl,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
    minHeight: 88,
  },
  ctaIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  ctaEyebrow: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.75)',
  },
  ctaTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    letterSpacing: -0.5,
    color: '#fff',
  },
  ctaSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  search: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    padding: 0,
  },
  filters: {
    gap: 8,
    paddingVertical: spacing.md,
    paddingRight: spacing.sm,
  },
  segment: {
    flexDirection: 'row',
    borderRadius: radii.lg,
    padding: 3,
    marginTop: spacing.lg,
  },
  segItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: radii.md,
  },
  segLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  catEmoji: {
    fontSize: 15,
  },
  catLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
});
