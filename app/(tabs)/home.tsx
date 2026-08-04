import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Alert,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
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
  Icon,
  ListRow,
  ScoreBadge,
  SectionHeader,
  elevation,
  fonts,
  motion,
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
import { usePremiumAccess } from '../../src/lib/premiumStore';

const showDemoTools = typeof __DEV__ !== 'undefined' && __DEV__;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ScalePressable({
  onPress,
  style,
  children,
}: {
  onPress: () => void;
  style?: object;
  children: ReactNode;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.98, motion.spring);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, motion.spring);
      }}
      style={[style, animStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}

export default function HomeScreen() {
  const { user, usingSupabase } = useAuth();
  const { teams } = useTeams();
  const { colors } = useTheme();
  const { guard } = usePremiumAccess();
  const [pool, setPool] = useState<UserProfile[]>(mockUsers);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [unreadLikes, setUnreadLikes] = useState(0);
  const [seedHint, setSeedHint] = useState<string | null>(null);

  const goLikes = () => {
    if (!guard()) return;
    router.push('/likes');
  };

  const goLikedMe = (userId: string) => {
    if (!guard()) return;
    router.push(`/liked-me/${userId}`);
  };

  const goUserProfile = (userId: string) => {
    if (!guard()) return;
    router.push(`/user/${userId}`);
  };

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
  const firstName = user.name?.split(' ')[0] ?? '';

  const onSeedIncoming = async () => {
    const likerId = await seedIncomingLikeFixture(user.id);
    await refreshLikesUi(user.id);
    setSeedHint('Maxime veut jumeler — ouvre la notif ci-dessous');
    Alert.alert(
      'Cas de test : invite reçue',
      'Maxime veut jumeler. Tape la ligne dans Activité récente (ou le badge) pour ouvrir « Maxime veut jumeler avec toi ».',
      [
        { text: 'Plus tard', style: 'cancel' },
        { text: 'Voir', onPress: () => goLikedMe(likerId) },
      ],
    );
  };

  const onSeedMutual = async () => {
    const likerId = await seedMutualLikeFixture(user.id);
    await refreshLikesUi(user.id);
    setSeedHint('Maya veut déjà jumeler — jumelle aussi ou via Discover');
    Alert.alert(
      'Cas de test : jumelage mutuel',
      'Maya veut déjà jumeler. Réponds « Jumeler aussi » (sheet) ou trouve-la dans Discover (swipe droite) → « C’est un jumelage ! ».',
      [
        { text: 'Discover', onPress: () => router.push('/(tabs)/discover') },
        { text: 'Jumeler Maya', onPress: () => goLikedMe(likerId) },
      ],
    );
  };

  return (
    <Atmosphere variant="bold">
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(380)} style={styles.topRow}>
            <View style={{ flex: 1, paddingRight: spacing.sm }}>
              <Text style={[styles.brand, { color: colors.primary }]}>Jumelo</Text>
              <Text style={[styles.hello, { color: colors.inkMuted }]}>
                {firstName ? `Salut ${firstName}` : 'Bienvenue'}
              </Text>
              <Text style={[styles.headline, { color: colors.primaryDark }]}>
                Trouve ton{'\n'}
                <Text style={[styles.headlineAccent, { color: colors.primary }]}>Jumelo</Text>
              </Text>
            </View>
            <View style={styles.topActions}>
              <Pressable
                onPress={goLikes}
                style={[
                  styles.notifBtn,
                  { backgroundColor: 'rgba(255,255,255,0.72)', borderColor: colors.border },
                ]}
                accessibilityLabel="Invites reçues"
              >
                <Icon name="social" size={20} color={colors.accent} weight="fill" />
                {unreadLikes > 0 ? (
                  <View style={[styles.notifBadge, { backgroundColor: colors.accent }]}>
                    <Text style={styles.notifBadgeText}>
                      {unreadLikes > 9 ? '9+' : unreadLikes}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
              <JumeloLottie name="spark" size={42} />
              <ThemeSwitcherButton />
            </View>
          </Animated.View>

          {showDemoTools ? (
            <Animated.View entering={FadeInDown.delay(40).duration(320)} style={styles.demoTools}>
              <Text style={[styles.demoLabel, { color: colors.inkFaint }]}>DEV · cas de test</Text>
              <View style={styles.demoRow}>
                <Pressable
                  onPress={onSeedIncoming}
                  style={[styles.demoBtn, { borderColor: colors.border }]}
                >
                  <Icon name="pulse" size={14} color={colors.inkFaint} weight="bold" />
                  <Text style={[styles.demoBtnText, { color: colors.inkFaint }]}>Invite reçue</Text>
                </Pressable>
                <Pressable
                  onPress={onSeedMutual}
                  style={[styles.demoBtn, { borderColor: colors.border }]}
                >
                  <Icon name="social" size={14} color={colors.inkFaint} weight="bold" />
                  <Text style={[styles.demoBtnText, { color: colors.inkFaint }]}>Jumelage mutuel</Text>
                </Pressable>
              </View>
              {seedHint ? (
                <Text style={[styles.seedHint, { color: colors.inkMuted }]}>{seedHint}</Text>
              ) : null}
            </Animated.View>
          ) : null}

          <Animated.View entering={FadeInDown.delay(80).duration(360)}>
            <ScalePressable
              onPress={() => router.push('/maintenant')}
              style={[styles.nowPress, elevation.glow(colors.primary)]}
            >
              <LinearGradient
                colors={[colors.primaryDark, colors.primary, colors.primary]}
                locations={[0, 0.55, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.nowCard}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.22)', 'transparent', 'rgba(255,255,255,0.08)']}
                  locations={[0, 0.5, 1]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.nowLiveRow}>
                  <View style={[styles.liveDot, { backgroundColor: '#fff' }]} />
                  <Text style={styles.nowEyebrow}>En direct</Text>
                </View>
                <View style={styles.nowBody}>
                  <View style={styles.nowCopy}>
                    <Text style={styles.nowTitle}>Un partenaire{'\n'}maintenant</Text>
                    <Text style={styles.nowSub}>Joueurs en ligne, dispo tout de suite</Text>
                  </View>
                  <View style={styles.nowIconWrap}>
                    <Icon name="live" size={28} color="#fff" weight="bold" />
                  </View>
                </View>
                <View style={styles.nowFooter}>
                  <Text style={styles.nowCta}>Ouvrir le lobby live</Text>
                  <Icon name="chevronRight" size={16} color="#fff" weight="bold" />
                </View>
              </LinearGradient>
            </ScalePressable>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(140).duration(380)}>
            <ScalePressable
              onPress={() => router.push('/(tabs)/discover')}
              style={[styles.dayPress, elevation.glow(colors.primary)]}
            >
              <LinearGradient
                colors={[colors.primary, colors.primary, colors.primaryDark]}
                locations={[0, 0.4, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.dayCard}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.2)', 'transparent', 'rgba(0,0,0,0.1)']}
                  locations={[0, 0.45, 1]}
                  start={{ x: 0.1, y: 0 }}
                  end={{ x: 0.9, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.dayDecor} pointerEvents="none">
                  <JumeloLottie name="bolt" size={140} style={{ opacity: 0.22 }} />
                </View>
                <View style={[styles.dayAccentBar, { backgroundColor: 'rgba(255,255,255,0.7)' }]} />
                <Text style={styles.dayEyebrow}>Jumelage du jour</Text>
                <Text style={styles.dayTitle}>Découvre tes{'\n'}jumelages du jour</Text>
                <Text style={styles.daySub}>Des coéquipiers compatibles t’attendent.</Text>
                <View style={styles.dayBtn}>
                  <Text style={[styles.dayBtnText, { color: colors.primaryDark }]}>
                    Trouver mon duo
                  </Text>
                  <Icon name="chevronRight" size={16} color={colors.primaryDark} weight="bold" />
                </View>
              </LinearGradient>
            </ScalePressable>
          </Animated.View>

          <SectionHeader
            title={`Top jumelages\ndu jour`}
            actionLabel="Voir tout"
            onAction={() => router.push('/(tabs)/discover')}
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.matchRow}
          >
            {topMatches.map((match, index) => {
              const cat = getCategory(match.user.universes[0]);
              return (
                <Animated.View
                  key={match.user.id}
                  entering={FadeInRight.delay(160 + index * 50).duration(340)}
                >
                  <Pressable
                    onPress={() => goUserProfile(match.user.id)}
                    style={[styles.matchCard, elevation.lift]}
                  >
                    <ImageBackground
                      source={{
                        uri:
                          match.user.photo ??
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(match.user.name)}&background=0F8F8A&color=fff&size=400`,
                      }}
                      style={styles.matchPhoto}
                      imageStyle={{ borderRadius: radii.lg }}
                    >
                      <LinearGradient
                        colors={[
                          'rgba(18,33,43,0.15)',
                          'transparent',
                          'rgba(18,33,43,0.88)',
                        ]}
                        locations={[0, 0.35, 1]}
                        style={styles.matchGradient}
                      >
                        <View style={styles.matchTop}>
                          {cat ? (
                            <CategoryPill
                              universeId={cat.id}
                              label={cat.shortLabel}
                              color={cat.color}
                            />
                          ) : null}
                          <View style={styles.scoreChip}>
                            <ScoreBadge score={match.score} />
                          </View>
                        </View>
                        <View style={styles.matchBottom}>
                          <Text style={styles.matchName}>{match.user.name}</Text>
                          <View style={styles.matchMeta}>
                            <Icon name="city" size={12} color="rgba(255,255,255,0.85)" />
                            <Text style={styles.matchCity}>{match.user.city}</Text>
                          </View>
                          {isOfficialJumelage(match.score) ? (
                            <View style={styles.jumelageChip}>
                              <Icon name="spark" size={11} color="#fff" weight="fill" />
                              <Text style={styles.jumelageTag}>Jumelage</Text>
                            </View>
                          ) : null}
                        </View>
                      </LinearGradient>
                    </ImageBackground>
                  </Pressable>
                </Animated.View>
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
                  <Icon name="teams" size={14} color={colors.inkMuted} />
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
            actionLabel={
              unreadLikes > 0 ? `${unreadLikes} non lu${unreadLikes > 1 ? 's' : ''}` : 'Voir'
            }
            onAction={goLikes}
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
                      item.kind === 'incoming_like'
                        ? goLikedMe(item.userId!)
                        : goUserProfile(item.userId!)
                  : undefined
              }
            />
          ))}

          <Pressable
            style={[
              styles.categoriesCta,
              { backgroundColor: colors.primarySoft, borderColor: colors.primary },
            ]}
            onPress={() => router.push('/categories')}
          >
            <Icon name="spark" size={18} color={colors.primaryDark} weight="bold" />
            <Text style={{ fontFamily: fonts.bodyBold, color: colors.primaryDark }}>
              Parcourir les catégories
            </Text>
            <Icon name="chevronRight" size={16} color={colors.primaryDark} weight="bold" />
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brand: {
    fontFamily: fonts.displaySoft,
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  hello: {
    ...typography.caption,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
  headline: {
    ...typography.hero,
    fontSize: 48,
    lineHeight: 50,
    letterSpacing: -1.8,
    marginTop: 8,
  },
  headlineAccent: {
    fontFamily: fonts.display,
    letterSpacing: -2,
  },
  notifBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
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
    gap: 6,
    opacity: 0.85,
  },
  demoLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  demoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  demoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  demoBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
  },
  seedHint: {
    fontFamily: fonts.body,
    fontSize: 12,
  },
  nowPress: {
    marginBottom: spacing.md,
    borderRadius: radii.xl,
  },
  nowCard: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    overflow: 'hidden',
    minHeight: 168,
  },
  nowLiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.sm,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  nowEyebrow: {
    color: 'rgba(255,255,255,0.72)',
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  nowBody: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
    flex: 1,
  },
  nowCopy: { flex: 1 },
  nowTitle: {
    fontFamily: fonts.display,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.7,
    color: '#fff',
  },
  nowSub: {
    color: 'rgba(255,255,255,0.78)',
    fontFamily: fonts.body,
    fontSize: 14,
    marginTop: 6,
  },
  nowIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nowFooter: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nowCta: {
    color: '#fff',
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  dayPress: {
    marginBottom: spacing.xl,
    borderRadius: radii.xl,
  },
  dayCard: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    overflow: 'hidden',
    minHeight: 200,
    ...elevation.lift,
  },
  dayDecor: {
    position: 'absolute',
    right: -28,
    top: -16,
  },
  dayAccentBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.55)',
    marginBottom: spacing.sm,
  },
  dayEyebrow: {
    color: 'rgba(255,255,255,0.72)',
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  dayTitle: {
    color: '#fff',
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.9,
    marginTop: spacing.sm,
  },
  daySub: {
    color: 'rgba(255,255,255,0.88)',
    fontFamily: fonts.body,
    marginTop: 8,
    marginBottom: spacing.md,
    maxWidth: '88%',
  },
  dayBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: radii.pill,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dayBtnText: { fontFamily: fonts.bodyBold },
  matchRow: { gap: 14, paddingRight: spacing.sm },
  matchCard: {
    width: 172,
    height: 248,
    borderRadius: radii.lg,
  },
  matchPhoto: { flex: 1 },
  matchGradient: {
    flex: 1,
    borderRadius: radii.lg,
    justifyContent: 'space-between',
    padding: 12,
  },
  matchTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  scoreChip: {
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.14)',
    padding: 2,
  },
  matchBottom: {
    gap: 2,
  },
  matchName: {
    color: '#fff',
    fontFamily: fonts.displaySemi,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  matchMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  matchCity: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: fonts.body,
    fontSize: 12,
  },
  jumelageChip: {
    marginTop: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  jumelageTag: {
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
