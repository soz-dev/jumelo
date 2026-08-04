import { Ionicons } from '@expo/vector-icons';
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
import { SafeAreaView } from 'react-native-safe-area-context';

import { Atmosphere } from '../../src/components/Atmosphere';
import { CategoryIcon } from '../../src/components/CategoryIcon';
import { ThemeSwitcherButton } from '../../src/components/ThemeSwitcher';
import { UniverseId, categories, getCategory } from '../../src/constants/catalog';
import { useTheme } from '../../src/context/ThemeContext';
import { useTeams } from '../../src/context/TeamsContext';
import {
  Chip,
  EmptyState,
  HeaderRow,
  fonts,
  radii,
  spacing,
} from '../../src/design-system';
import { ensureTeamChat } from '../../src/lib/api/teamChats';
import type { TeamMembershipState } from '../../src/lib/api/teams';

function joinLabel(state: TeamMembershipState): string {
  switch (state) {
    case 'owner':
      return 'Gérer';
    case 'member':
      return 'Chat groupe';
    case 'pending':
      return 'En attente';
    case 'rejected':
      return 'Redemander';
    default:
      return 'Demander';
  }
}

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
    <Atmosphere>
      <SafeAreaView style={[styles.safe, { backgroundColor: 'transparent' }]} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <HeaderRow
            title="Lobby équipes"
            subtitle="Trouve un squad ou crée le tien — vibe joueur"
            right={
              <View style={styles.actions}>
                <ThemeSwitcherButton />
                <Pressable
                  style={[styles.fab, { backgroundColor: colors.primary }]}
                  onPress={() => router.push('/team/create')}
                  accessibilityLabel="Créer une équipe"
                >
                  <Ionicons name="add" size={24} color="#fff" />
                </Pressable>
              </View>
            }
          />

          <Pressable
            onPress={() => router.push('/team/create')}
            style={[
              styles.ctaBanner,
              { backgroundColor: colors.primarySoft, borderColor: colors.primary },
            ]}
          >
            <Text style={styles.ctaEmoji}>🎮</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.ctaTitle, { color: colors.primaryDark }]}>
                Créer un lobby
              </Text>
              <Text style={{ color: colors.inkMuted, fontFamily: fonts.body, fontSize: 13 }}>
                Choisis ton jeu, fixe les slots, invite ta team
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={colors.primaryDark} />
          </Pressable>

          <View
            style={[
              styles.search,
              { backgroundColor: colors.white, borderColor: colors.border },
            ]}
          >
            <Ionicons name="search" size={18} color={colors.inkFaint} />
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
                icon={
                  (
                    {
                      gaming: 'game-controller',
                      sports: 'barbell',
                      education: 'book',
                      music: 'musical-notes',
                      hobbies: 'color-palette',
                    } as const
                  )[cat.id]
                }
                label={`${cat.emoji} ${cat.shortLabel}`}
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

          {filtered.map((team) => {
            const cat = getCategory(team.universe);
            const progress = team.membersCount / team.capacity;
            const state = getMembership(team.id);
            const label = joinLabel(state);
            const joinDisabled = state === 'pending' || busyId === team.id;
            const joinBg =
              state === 'pending'
                ? colors.inkFaint
                : state === 'member' || state === 'owner'
                  ? colors.primarySoft
                  : colors.primary;
            const joinTextColor =
              state === 'member' || state === 'owner' ? colors.primaryDark : '#fff';

            return (
              <View
                key={team.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.white,
                    borderColor:
                      team.universe === 'gaming' ? `${cat?.color ?? colors.primary}99` : colors.border,
                  },
                ]}
              >
                <View style={[styles.topBar, { backgroundColor: cat?.color ?? colors.primary }]} />
                <View style={styles.cardBody}>
                  <View style={styles.cardTop}>
                    <CategoryIcon universeId={team.universe} size={44} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.name, { color: colors.ink }]}>{team.name}</Text>
                      <Text style={{ color: colors.inkMuted, fontFamily: fonts.body }}>
                        {team.universe === 'gaming' ? '🎮 ' : ''}
                        {team.activity}
                      </Text>
                    </View>
                    <View style={[styles.vibe, { backgroundColor: colors.primarySoft }]}>
                      <Text
                        style={{
                          color: colors.primaryDark,
                          fontFamily: fonts.bodyMedium,
                          fontSize: 12,
                        }}
                      >
                        {team.vibe}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.metaRow}>
                    <Ionicons name="location-outline" size={14} color={colors.inkMuted} />
                    <Text style={[styles.meta, { color: colors.inkMuted }]}>{team.city}</Text>
                    <Ionicons name="people-outline" size={14} color={colors.inkMuted} />
                    <Text style={[styles.meta, { color: colors.inkMuted }]}>
                      {team.membersCount}/{team.capacity}
                    </Text>
                    <Text style={[styles.meta, { color: colors.inkMuted }]}>
                      · Niveau: {team.levelLabel}
                    </Text>
                  </View>

                  {state === 'pending' ? (
                    <View style={[styles.pendingBanner, { backgroundColor: colors.primarySoft }]}>
                      <Ionicons name="time-outline" size={16} color={colors.primaryDark} />
                      <Text
                        style={{
                          color: colors.primaryDark,
                          fontFamily: fonts.bodyMedium,
                          fontSize: 13,
                          flex: 1,
                        }}
                      >
                        En attente d’approbation
                      </Text>
                    </View>
                  ) : null}

                  <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(progress, 1) * 100}%`,
                          backgroundColor: cat?.color ?? colors.primary,
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.rowBtns}>
                    <Pressable
                      style={[styles.join, { backgroundColor: joinBg }]}
                      disabled={joinDisabled && state === 'pending'}
                      onPress={() => onJoinPress(team.id, state)}
                    >
                      {busyId === team.id ? (
                        <ActivityIndicator color={joinTextColor} />
                      ) : (
                        <Text style={[styles.joinText, { color: joinTextColor }]}>{label}</Text>
                      )}
                    </Pressable>
                    <Pressable
                      style={[styles.details, { borderColor: colors.border }]}
                      onPress={() => router.push(`/team/${team.id}`)}
                    >
                      <Text style={{ color: colors.ink, fontFamily: fonts.bodyMedium }}>
                        Détails
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
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
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBanner: {
    marginTop: spacing.md,
    borderWidth: 1.5,
    borderRadius: radii.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  ctaEmoji: { fontSize: 28 },
  ctaTitle: { fontFamily: fonts.bodyBold, fontSize: 16, marginBottom: 2 },
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
  card: {
    borderWidth: 1,
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  topBar: { height: 4 },
  cardBody: { padding: spacing.md },
  cardTop: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  name: { fontFamily: fonts.bodyBold, fontSize: 16 },
  vibe: {
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: spacing.md,
  },
  meta: { fontFamily: fonts.body, fontSize: 13 },
  pendingBanner: {
    marginTop: spacing.sm,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: { height: '100%' },
  rowBtns: { flexDirection: 'row', gap: 10, marginTop: spacing.md },
  join: {
    flex: 1,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    minHeight: 44,
  },
  joinText: { fontFamily: fonts.bodyBold },
  details: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
