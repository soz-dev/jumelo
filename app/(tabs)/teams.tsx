import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
  Chip,
  EmptyState,
  HeaderRow,
  Icon,
  elevation,
  fonts,
  radii,
  spacing,
  withHexAlpha,
} from '../../src/design-system';
import { ensureTeamChat } from '../../src/lib/api/teamChats';
import type { TeamMembershipState } from '../../src/lib/api/teams';

export default function TeamsScreen() {
  const { colors } = useTheme();
  const { teams, loading, refresh, getMembership, requestToJoin } = useTeams();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<UniverseId | 'all'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      refresh().catch(() => undefined);
    }, [refresh]),
  );

  const filtered = useMemo(
    () =>
      teams.filter((team) => {
        const matchesFilter = filter === 'all' || team.universe === filter;
        const q = query.trim().toLowerCase();
        const matchesQuery =
          !q ||
          team.name.toLowerCase().includes(q) ||
          team.activity.toLowerCase().includes(q);
        return matchesFilter && matchesQuery;
      }),
    [filter, query, teams],
  );

  const onJoinPress = async (teamId: string, state: TeamMembershipState) => {
    if (state === 'owner' || state === 'pending') {
      router.push(`/team/${teamId}`);
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
      router.push(`/team/${teamId}`);
      return;
    }
    setBusyId(teamId);
    const result = await requestToJoin(teamId);
    setBusyId(null);
    if (!result.ok) {
      router.push(`/team/${teamId}`);
      return;
    }
    router.push(`/team/${teamId}`);
  };

  return (
    <Atmosphere variant="bold">
      <SafeAreaView style={[styles.safe, { backgroundColor: 'transparent' }]} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <HeaderRow
            title="Lobby équipes"
            subtitle="Trouve un squad ou crée le tien"
            right={
              <View style={styles.actions}>
                <BrandLogo size={34} />
                <ThemeSwitcherButton />
                <Pressable
                  style={[
                    styles.fab,
                    { backgroundColor: colors.primary },
                    elevation.glow(colors.primary),
                  ]}
                  onPress={() => router.push('/team/create')}
                  accessibilityLabel="Créer une équipe"
                >
                  <Icon name="plus" size={22} color="#fff" weight="bold" />
                </Pressable>
              </View>
            }
          />

          <Animated.View entering={FadeInDown.duration(320)}>
            <Pressable
              onPress={() => router.push('/team/create')}
              style={[styles.ctaPress, elevation.glow(colors.primary)]}
            >
              <LinearGradient
                colors={[colors.primaryDark, colors.primary, colors.primary]}
                locations={[0, 0.55, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaBanner}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.2)', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.ctaIcon}>
                  <Icon name="teams" size={22} color="#fff" weight="bold" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ctaEyebrow}>Nouveau lobby</Text>
                  <Text style={styles.ctaTitle}>Créer une équipe</Text>
                  <Text style={styles.ctaSub}>
                    Choisis ton jeu, fixe les slots, invite
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
              placeholder="Rechercher un jeu, une équipe…"
              placeholderTextColor={colors.inkFaint}
              style={[styles.searchInput, { color: colors.ink }]}
            />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filters}
          >
            <Chip label="Tout" selected={filter === 'all'} onPress={() => setFilter('all')} />
            {categories.map((cat) => (
              <Chip
                key={cat.id}
                name={cat.id}
                label={cat.shortLabel}
                selected={filter === cat.id}
                onPress={() => setFilter(cat.id)}
              />
            ))}
          </ScrollView>

          {loading && teams.length === 0 ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
          ) : null}

          {!loading && filtered.length === 0 ? (
            <EmptyState
              title="Aucune équipe"
              description="Crée la tienne ou élargis les filtres."
              lottie="bolt"
              actionLabel="Créer une équipe"
              onAction={() => router.push('/team/create')}
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
                  onJoin={() => onJoinPress(team.id, state)}
                  onDetails={() => router.push(`/team/${team.id}`)}
                />
              </Animated.View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  actions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  fab: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPress: {
    marginTop: spacing.md,
    borderRadius: radii.xl,
  },
  ctaBanner: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    overflow: 'hidden',
    minHeight: 108,
  },
  ctaIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaEyebrow: {
    color: 'rgba(255,255,255,0.72)',
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  ctaTitle: {
    color: '#fff',
    fontFamily: fonts.displaySemi,
    fontSize: 20,
    letterSpacing: -0.4,
    marginBottom: 2,
  },
  ctaSub: {
    color: 'rgba(255,255,255,0.78)',
    fontFamily: fonts.body,
    fontSize: 13,
  },
  search: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 15 },
  filters: { paddingVertical: spacing.md },
});
