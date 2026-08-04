import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Atmosphere } from '../../src/components/Atmosphere';
import { CategoryIcon } from '../../src/components/CategoryIcon';
import { JumeloLottie } from '../../src/components/JumeloLottie';
import { ThemeSwitcherButton } from '../../src/components/ThemeSwitcher';
import { getCategory } from '../../src/constants/catalog';
import { useAuth } from '../../src/context/AuthContext';
import { useTeams } from '../../src/context/TeamsContext';
import { useTheme } from '../../src/context/ThemeContext';
import { mockActivity, mockUsers, type UserProfile } from '../../src/data/mock';
import {
  CategoryPill,
  ListRow,
  ScoreBadge,
  SectionHeader,
  elevation,
  fonts,
  radii,
  spacing,
  typography,
} from '../../src/design-system';
import { listProfiles } from '../../src/lib/api/profiles';
import {
  buildLikeActivity,
  countUnreadIncomingLikes,
  ensureDemoIncomingLikes,
  seedIncomingLikeFixture,
  seedMutualLikeFixture,
  type ActivityItem,
} from '../../src/lib/likesStore';
import { isOfficialJumelage, rankMatches } from '../../src/lib/matching';

const showDemoTools = typeof __DEV__ !== 'undefined' && __DEV__;

export default function HomeScreen() {
  const { user, usingSupabase } = useAuth();
  const { teams } = useTeams();
  const { colors } = useTheme();
  const [pool, setPool] = useState<UserProfile[]>(mockUsers);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [unreadLikes, setUnreadLikes] = useState(0);
  const [seedHint, setSeedHint] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!usingSupabase || !user || user.id.startsWith('u-') || user.id.startsWith('fb-')) {
      setPool(mockUsers);
      return;
    }
    (async () => {
      const remote = await listProfiles(user.id);
      if (active) setPool(remote.length ? remote : mockUsers);
    })();
    return () => {
      active = false;
    };
  }, [usingSupabase, user]);

  const refreshLikesUi = useCallback(async (userId: string) => {
    await ensureDemoIncomingLikes(userId);
    const [items, unread] = await Promise.all([
      buildLikeActivity(userId),
      countUnreadIncomingLikes(userId),
    ]);
    const fallback: ActivityItem[] = mockActivity.map((item) => ({
      id: item.id,
      kind: 'other' as const,
      text: item.text,
      time: item.time,
      color: item.color,
    }));
    setActivity(items.length ? items : fallback);
    setUnreadLikes(unread);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      void refreshLikesUi(user.id);
    }, [user, refreshLikesUi]),
  );

  const topMatches = useMemo(
    () => (user ? rankMatches(user, pool).slice(0, 6) : []),
    [user, pool],
  );

  if (!user) return null;

  const activeTeams = teams.slice(0, 3);

  const onSeedIncoming = async () => {
    const likerId = await seedIncomingLikeFixture(user.id);
    await refreshLikesUi(user.id);
    setSeedHint('Maxime t’a liké — ouvre la notif ci-dessous');
    Alert.alert(
      'Cas de test : like reçu',
      'Maxime a liké ton profil. Tape la ligne dans Activité récente (ou le badge cœur) pour ouvrir « Maxime t’a liké ».',
      [
        { text: 'Plus tard', style: 'cancel' },
        { text: 'Voir', onPress: () => router.push(`/liked-me/${likerId}`) },
      ],
    );
  };

  const onSeedMutual = async () => {
    const likerId = await seedMutualLikeFixture(user.id);
    await refreshLikesUi(user.id);
    setSeedHint('Maya t’a déjà liké — like-la en retour ou dans Discover');
    Alert.alert(
      'Cas de test : like mutuel',
      'Maya t’a déjà liké. Like-la en retour (sheet) ou trouve-la dans Discover (cœur / swipe droite) → « C’est un match! ».',
      [
        { text: 'Discover', onPress: () => router.push('/(tabs)/discover') },
        { text: 'Liker Maya', onPress: () => router.push(`/liked-me/${likerId}`) },
      ],
    );
  };

  return (
    <Atmosphere variant="soft">
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(360)} style={styles.topRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.hello, { color: colors.inkMuted }]}>Bienvenue</Text>
              <Text style={[styles.headline, { color: colors.ink }]}>
                Trouve ton{'\n'}Jumelo
              </Text>
            </View>
            <View style={styles.topActions}>
              <Pressable
                onPress={() => router.push('/likes')}
                style={[styles.notifBtn, { backgroundColor: colors.white, borderColor: colors.border }]}
                accessibilityLabel="Qui t’a liké"
              >
                <Ionicons name="heart" size={20} color={colors.accent} />
                {unreadLikes > 0 ? (
                  <View style={[styles.notifBadge, { backgroundColor: colors.accent }]}>
                    <Text style={styles.notifBadgeText}>{unreadLikes > 9 ? '9+' : unreadLikes}</Text>
                  </View>
                ) : null}
              </Pressable>
              <JumeloLottie name="spark" size={42} />
              <ThemeSwitcherButton />
            </View>
          </Animated.View>

          {showDemoTools ? (
            <View style={styles.demoTools}>
              <Text style={[styles.demoLabel, { color: colors.inkFaint }]}>Cas de test (__DEV__)</Text>
              <View style={styles.demoRow}>
                <Pressable
                  onPress={onSeedIncoming}
                  style={[styles.demoBtn, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}
                >
                  <Ionicons name="notifications-outline" size={16} color={colors.primaryDark} />
                  <Text style={[styles.demoBtnText, { color: colors.primaryDark }]}>
                    Like reçu
                  </Text>
                </Pressable>
                <Pressable
                  onPress={onSeedMutual}
                  style={[styles.demoBtn, { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}
                >
                  <Ionicons name="heart-outline" size={16} color={colors.accent} />
                  <Text style={[styles.demoBtnText, { color: colors.accent }]}>
                    Like mutuel
                  </Text>
                </Pressable>
              </View>
              {seedHint ? (
                <Text style={[styles.seedHint, { color: colors.inkMuted }]}>{seedHint}</Text>
              ) : null}
            </View>
          ) : null}

          <Pressable
            onPress={() => router.push('/maintenant')}
            style={[styles.nowPress, elevation.glow(colors.accent)]}
          >
            <LinearGradient
              colors={[colors.accent, colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.nowBorder}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                start={{ x: 0, y: 0.2 }}
                end={{ x: 1, y: 1 }}
                style={styles.nowCard}
              >
                <View style={styles.nowLottie}>
                  <JumeloLottie name="bolt" size={72} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nowEyebrow}>EN DIRECT</Text>
                  <Text style={styles.nowTitle}>Un partenaire maintenant</Text>
                  <Text style={styles.nowSub}>
                    Joueurs en ligne, dispo tout de suite
                  </Text>
                </View>
                <View style={styles.nowChevron}>
                  <Ionicons name="chevron-forward" size={22} color="#fff" />
                </View>
              </LinearGradient>
            </LinearGradient>
          </Pressable>

          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.dayCard}
          >
            <View style={styles.dayDecor} pointerEvents="none">
              <JumeloLottie name="bolt" size={120} style={{ opacity: 0.35 }} />
            </View>
            <Text style={styles.dayEyebrow}>MATCH DU JOUR</Text>
            <Text style={styles.dayTitle}>Découvre tes{'\n'}matchs du jour</Text>
            <Text style={styles.daySub}>Des coéquipiers compatibles t’attendent.</Text>
            <Pressable
              style={styles.dayBtn}
              onPress={() => router.push('/(tabs)/discover')}
            >
              <Text style={[styles.dayBtnText, { color: colors.primary }]}>
                Trouver mon duo
              </Text>
              <Ionicons name="arrow-forward" size={16} color={colors.primary} />
            </Pressable>
          </LinearGradient>

          <SectionHeader
            title={`Top matchs\ndu jour`}
            actionLabel="Voir tout"
            onAction={() => router.push('/(tabs)/discover')}
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {topMatches.map((match) => {
              const cat = getCategory(match.user.universes[0]);
              return (
                <Pressable
                  key={match.user.id}
                  onPress={() => router.push(`/user/${match.user.id}`)}
                  style={styles.matchCard}
                >
                  <ImageBackground
                    source={{
                      uri:
                        match.user.photo ??
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(match.user.name)}&background=0F8F8A&color=fff&size=400`,
                    }}
                    style={styles.matchPhoto}
                    imageStyle={{ borderRadius: radii.md }}
                  >
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.78)']}
                      style={styles.matchGradient}
                    >
                      {cat ? (
                        <View style={styles.matchPill}>
                          <CategoryPill
                            universeId={cat.id}
                            label={cat.shortLabel}
                            color={cat.color}
                          />
                        </View>
                      ) : null}
                      <View style={styles.matchBottom}>
                        <View>
                          <Text style={styles.matchName}>{match.user.name}</Text>
                          <Text style={styles.matchCity}>{match.user.city}</Text>
                          {isOfficialJumelage(match.score) ? (
                            <Text style={styles.jumelageTag}>Jumelage</Text>
                          ) : null}
                        </View>
                        <ScoreBadge score={match.score} />
                      </View>
                    </LinearGradient>
                  </ImageBackground>
                </Pressable>
              );
            })}
          </ScrollView>

          <SectionHeader
            title="Équipes actives"
            actionLabel="Voir tout"
            onAction={() => router.push('/(tabs)/teams')}
          />

          {activeTeams.map((team) => (
            <ListRow
              key={team.id}
              title={team.name}
              subtitle={team.activity}
              left={<CategoryIcon universeId={team.universe} />}
              right={
                <View style={styles.members}>
                  <Ionicons name="people" size={14} color={colors.inkMuted} />
                  <Text style={{ color: colors.inkMuted, fontFamily: fonts.bodyMedium }}>
                    {team.membersCount}/{team.capacity}
                  </Text>
                </View>
              }
              onPress={() => router.push(`/team/${team.id}`)}
            />
          ))}

          <SectionHeader
            title="Activité récente"
            actionLabel={unreadLikes > 0 ? `${unreadLikes} non lu${unreadLikes > 1 ? 's' : ''}` : 'Voir'}
            onAction={() => router.push('/likes')}
          />
          {activity.map((item) => (
            <ListRow
              key={item.id}
              title={item.text}
              subtitle={item.time}
              left={
                <View style={styles.dotWrap}>
                  <View style={[styles.dot, { backgroundColor: item.color }]} />
                  {item.unread ? (
                    <View style={[styles.unreadRing, { borderColor: colors.accent }]} />
                  ) : null}
                </View>
              }
              chevron={item.kind === 'incoming_like' || item.kind === 'match'}
              onPress={
                item.userId
                  ? () =>
                      router.push(
                        item.kind === 'incoming_like'
                          ? `/liked-me/${item.userId}`
                          : `/user/${item.userId}`,
                      )
                  : undefined
              }
            />
          ))}

          <Pressable
            style={[styles.categoriesCta, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}
            onPress={() => router.push('/categories')}
          >
            <Ionicons name="layers-outline" size={18} color={colors.primaryDark} />
            <Text style={{ fontFamily: fonts.bodyBold, color: colors.primaryDark }}>
              Parcourir les catégories
            </Text>
            <Ionicons name="arrow-forward" size={16} color={colors.primaryDark} />
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.lg },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notifBadgeText: {
    color: '#fff',
    fontFamily: fonts.bodyBold,
    fontSize: 10,
  },
  demoTools: {
    marginBottom: spacing.md,
    gap: 8,
  },
  demoLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  demoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  demoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  demoBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  seedHint: {
    fontFamily: fonts.body,
    fontSize: 13,
  },
  hello: {
    ...typography.overline,
  },
  headline: {
    ...typography.hero,
    fontSize: 38,
    lineHeight: 42,
    marginTop: 6,
  },
  nowPress: {
    marginBottom: spacing.md,
    borderRadius: radii.xl,
  },
  nowBorder: {
    borderRadius: radii.xl,
    padding: 2.5,
  },
  nowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.xl - 2,
    paddingVertical: spacing.md + 4,
    paddingHorizontal: spacing.md,
    minHeight: 96,
    overflow: 'hidden',
  },
  nowLottie: { width: 64, height: 64, marginLeft: -6 },
  nowEyebrow: {
    color: 'rgba(255,255,255,0.78)',
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.3,
    marginBottom: 4,
  },
  nowTitle: {
    fontFamily: fonts.displaySemi,
    fontSize: 20,
    letterSpacing: -0.4,
    color: '#fff',
  },
  nowSub: {
    color: 'rgba(255,255,255,0.88)',
    fontFamily: fonts.body,
    fontSize: 14,
    marginTop: 2,
  },
  nowChevron: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCard: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    overflow: 'hidden',
    ...elevation.lift,
  },
  dayDecor: {
    position: 'absolute',
    right: -20,
    top: -10,
  },
  dayEyebrow: {
    color: 'rgba(255,255,255,0.75)',
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.4,
  },
  dayTitle: {
    color: '#fff',
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.8,
    marginTop: spacing.sm,
  },
  daySub: {
    color: 'rgba(255,255,255,0.88)',
    fontFamily: fonts.body,
    marginTop: 8,
    marginBottom: spacing.md,
  },
  dayBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: radii.pill,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayBtnText: { fontFamily: fonts.bodyBold },
  sectionTitle: {
    ...typography.title,
  },
  matchCard: { width: 160, height: 220 },
  matchPhoto: { flex: 1 },
  matchGradient: {
    flex: 1,
    borderRadius: radii.md,
    justifyContent: 'space-between',
    padding: 10,
  },
  matchPill: { alignSelf: 'flex-start' },
  matchBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  matchName: { color: '#fff', fontFamily: fonts.displaySemi, fontSize: 16 },
  matchCity: { color: 'rgba(255,255,255,0.85)', fontFamily: fonts.body, fontSize: 12 },
  jumelageTag: {
    marginTop: 4,
    color: '#fff',
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 0.4,
  },
  members: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dotWrap: { width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  unreadRing: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  categoriesCta: {
    marginTop: spacing.xl,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
  },
});
