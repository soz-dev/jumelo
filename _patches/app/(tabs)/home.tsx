import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Atmosphere } from '../../src/components/Atmosphere';
import { DiscoverAppsSection } from '../../src/components/DiscoverApps';
import { JumeloLottie } from '../../src/components/JumeloLottie';
import { CategoryIcon } from '../../src/components/CategoryIcon';
import { ThemeSwitcherButton } from '../../src/components/ThemeSwitcher';
import { getCategory } from '../../src/constants/catalog';
import { useAuth } from '../../src/context/AuthContext';
import { useTeams } from '../../src/context/TeamsContext';
import { useTheme } from '../../src/context/ThemeContext';
import { mockUsers, type UserProfile } from '../../src/data/mock';
import {
  Icon,
  ListRow,
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
  ensureDemoIncomingLikes,
  loadSeenActivityIds,
  markActivityIdsSeen,
  type ActivityItem,
} from '../../src/lib/likesStore';
import {
  listIncomingDailyAccepts,
  seedIncomingDailyAccept,
} from '../../src/lib/dailyJumelo';
import { usePremiumAccess } from '../../src/lib/premiumStore';
import { isDuoCapacity } from '../../src/lib/teamKind';

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
  const { myActiveTeams } = useTeams();
  const { colors } = useTheme();
  const { guard } = usePremiumAccess();
  const insets = useSafeAreaInsets();
  const [pool, setPool] = useState<UserProfile[]>(mockUsers);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [unreadLikes, setUnreadLikes] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [seedHint, setSeedHint] = useState<string | null>(null);
  const [domainFilter, setDomainFilter] = useState<string | 'all'>('all');

  const goDailyJumelo = () => {
    if (!guard()) return;
    router.push('/(tabs)/discover');
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

  const refreshActivity = useCallback(async (userId: string) => {
    // Nettoie les anciennes invites Discover seedées (Maxime, etc.).
    await ensureDemoIncomingLikes(userId);
    const [incoming, seen] = await Promise.all([
      listIncomingDailyAccepts(userId),
      loadSeenActivityIds(),
    ]);
    const items: ActivityItem[] = incoming.map((row) => {
      const peer = mockUsers.find((u) => u.id === row.fromUserId);
      const name = peer?.name ?? 'Quelqu’un';
      const id = `daily-${row.fromUserId}-${row.at}`;
      return {
        id,
        kind: 'incoming_like' as const,
        text: `${name} a validé votre proposition du jour`,
        time: 'aujourd’hui',
        color: '#0186F0',
        userId: row.fromUserId,
        unread: !seen.has(id),
      };
    });
    setActivity(items);
    setUnreadLikes(items.filter((i) => i.unread).length);
  }, []);

  const openNotifications = useCallback(async () => {
    setNotifOpen(true);
    if (!activity.length) return;
    const ids = activity.map((i) => i.id);
    await markActivityIdsSeen(ids);
    setActivity((prev) => prev.map((i) => ({ ...i, unread: false })));
    setUnreadLikes(0);
  }, [activity]);

  const closeNotifications = () => setNotifOpen(false);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      void refreshActivity(user.id);
    }, [user, refreshActivity]),
  );

  if (!user) return null;

  const myDuos = myActiveTeams.filter((t) => isDuoCapacity(t.capacity));
  const duoDomains = Array.from(
    new Set(myDuos.map((t) => t.universe).filter(Boolean)),
  ) as string[];
  const filteredDuos =
    domainFilter === 'all'
      ? myDuos
      : myDuos.filter((t) => t.universe === domainFilter);
  const heroDuo = filteredDuos[0] ?? null;
  const firstName = user.name?.split(' ')[0] ?? '';

  const onSeedIncoming = async () => {
    await seedIncomingDailyAccept(user.id, 'u-maxime');
    await refreshActivity(user.id);
    setSeedHint('Maxime a validé — ouvre Du jour');
    Alert.alert(
      'Cas de test : acceptation reçue',
      'Maxime a validé sa proposition du jour vers toi (algorithme). Ouvre l’onglet Du jour pour répondre — le jumelo se forme seulement si c’est mutuel.',
      [
        { text: 'Plus tard', style: 'cancel' },
        { text: 'Du jour', onPress: goDailyJumelo },
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
                Trouve{'\n'}
                <Text style={[styles.headlineAccent, { color: colors.primary }]}>ton jumelo</Text>
              </Text>
            </View>
            <View style={styles.topActions}>
              <Pressable
                onPress={() => void openNotifications()}
                style={[
                  styles.notifBtn,
                  { backgroundColor: 'rgba(255,255,255,0.72)', borderColor: colors.border },
                ]}
                accessibilityLabel={
                  unreadLikes > 0
                    ? `Notifications, ${unreadLikes} non lues`
                    : 'Notifications'
                }
              >
                <Icon
                  name="bell"
                  size={20}
                  color={unreadLikes > 0 ? colors.primary : colors.inkMuted}
                  weight={unreadLikes > 0 ? 'fill' : 'regular'}
                />
                {unreadLikes > 0 ? (
                  <View style={[styles.notifBadge, { backgroundColor: colors.primary }]}>
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
                  <Text style={[styles.demoBtnText, { color: colors.inkFaint }]}>
                    Acceptation reçue
                  </Text>
                </Pressable>
              </View>
              {seedHint ? (
                <Text style={[styles.seedHint, { color: colors.inkMuted }]}>{seedHint}</Text>
              ) : null}
            </Animated.View>
          ) : null}

          <Animated.View entering={FadeInDown.delay(80).duration(380)} style={styles.entryRow}>
            <ScalePressable
              onPress={() =>
                router.push({ pathname: '/(tabs)/teams', params: { format: 'duos' } })
              }
              style={[styles.entryPress, elevation.glow(colors.primary)]}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.entryCard}
              >
                <View style={styles.entryIconWrap}>
                  <Icon name="social" size={26} color="#fff" weight="fill" />
                </View>
                <Text style={styles.entryEyebrow}>Recommandé</Text>
                <Text style={styles.entryTitle}>Duo</Text>
                <Text style={styles.entrySub}>Binômes existants + créer le tien</Text>
                <View style={styles.entryCta}>
                  <Text style={styles.entryCtaText}>Voir les duos</Text>
                  <Icon name="chevronRight" size={14} color="#fff" weight="bold" />
                </View>
              </LinearGradient>
            </ScalePressable>

            <ScalePressable
              onPress={() =>
                router.push({ pathname: '/(tabs)/teams', params: { format: 'groupes' } })
              }
              style={styles.entryPress}
            >
              <View
                style={[
                  styles.entryCard,
                  styles.entryCardSoft,
                  {
                    backgroundColor: colors.white,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.entryIconWrap,
                    { backgroundColor: colors.primarySoft },
                  ]}
                >
                  <Icon name="teams" size={26} color={colors.primaryDark} weight="fill" />
                </View>
                <Text style={[styles.entryEyebrow, { color: colors.inkMuted }]}>Annexe</Text>
                <Text style={[styles.entryTitle, { color: colors.ink }]}>Équipe</Text>
                <Text style={[styles.entrySub, { color: colors.inkMuted }]}>
                  Groupes 3+ existants + en créer un
                </Text>
                <View style={[styles.entryCta, { backgroundColor: colors.primarySoft }]}>
                  <Text style={[styles.entryCtaText, { color: colors.primaryDark }]}>
                    Voir les équipes
                  </Text>
                  <Icon name="chevronRight" size={14} color={colors.primaryDark} weight="bold" />
                </View>
              </View>
            </ScalePressable>
          </Animated.View>

          <SectionHeader
            title="Tes jumelos"
            subtitle={
              myDuos.length
                ? `${myDuos.length} duo${myDuos.length > 1 ? 's' : ''} actif${myDuos.length > 1 ? 's' : ''}`
                : 'Le cœur de Jumelo'
            }
            actionLabel="Lobby"
            onAction={() => router.push('/(tabs)/teams')}
          />

          {myDuos.length === 0 ? (
            <ListRow
              title="Aucun jumelo validé pour l’instant"
              subtitle="Accepte la proposition du jour — si c’est mutuel, votre duo apparaît ici"
              left={<Icon name="social" size={20} color={colors.inkMuted} />}
              onPress={goDailyJumelo}
            />
          ) : (
            <View style={{ gap: spacing.sm, marginBottom: spacing.md }}>
              {duoDomains.length > 1 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.domainRow}
                >
                  <Pressable
                    onPress={() => setDomainFilter('all')}
                    style={[
                      styles.domainChip,
                      {
                        backgroundColor:
                          domainFilter === 'all' ? colors.primary : colors.white,
                        borderColor:
                          domainFilter === 'all' ? colors.primaryDark : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: domainFilter === 'all' ? '#fff' : colors.inkMuted,
                        fontFamily: fonts.bodyBold,
                        fontSize: 12,
                      }}
                    >
                      Tous
                    </Text>
                  </Pressable>
                  {duoDomains.map((domain) => {
                    const cat = getCategory(domain as any);
                    const selected = domainFilter === domain;
                    return (
                      <Pressable
                        key={domain}
                        onPress={() => setDomainFilter(domain)}
                        style={[
                          styles.domainChip,
                          {
                            backgroundColor: selected ? colors.primary : colors.white,
                            borderColor: selected ? colors.primaryDark : colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: selected ? '#fff' : colors.inkMuted,
                            fontFamily: fonts.bodyBold,
                            fontSize: 12,
                          }}
                        >
                          {cat?.shortLabel ?? domain}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              ) : null}

              {heroDuo ? (
                <ScalePressable
                  onPress={() => router.push(`/jumelo/${heroDuo.id}`)}
                  style={[styles.heroDuoPress, elevation.glow(colors.primary)]}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.primaryDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.heroDuo}
                  >
                    <View style={styles.heroDuoTop}>
                      <CategoryIcon universeId={heroDuo.universe} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.heroEyebrow}>Jumelo actif</Text>
                        <Text style={styles.heroTitle} numberOfLines={1}>
                          {heroDuo.name}
                        </Text>
                        <Text style={styles.heroSub} numberOfLines={1}>
                          {heroDuo.activity} ·{' '}
                          {getCategory(heroDuo.universe as any)?.shortLabel ?? 'duo'}
                        </Text>
                      </View>
                      <View style={styles.entryCta}>
                        <Text style={styles.entryCtaText}>Ouvrir</Text>
                        <Icon name="chevronRight" size={14} color="#fff" weight="bold" />
                      </View>
                    </View>
                  </LinearGradient>
                </ScalePressable>
              ) : null}

              {filteredDuos.slice(heroDuo ? 1 : 0).map((team) => (
                <ListRow
                  key={team.id}
                  title={team.name}
                  subtitle={`${team.activity} · ${getCategory(team.universe as any)?.shortLabel ?? 'jumelo'}`}
                  left={<CategoryIcon universeId={team.universe} />}
                  right={
                    <View style={styles.members}>
                      <Icon name="social" size={14} color={colors.inkMuted} />
                      <Text style={{ color: colors.inkMuted, fontFamily: fonts.bodyMedium }}>
                        {team.membersCount}/{team.capacity}
                      </Text>
                    </View>
                  }
                  onPress={() => router.push(`/jumelo/${team.id}`)}
                />
              ))}
            </View>
          )}

          <SectionHeader
            title="Jumelo du jour"
            subtitle="1 proposition · 24 h · match mutuel"
          />

          <ScalePressable
            onPress={() => {
              if (!guard()) return;
              router.push('/(tabs)/discover');
            }}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.dailyCta, elevation.lift]}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.dailyCtaTitle}>Ton binôme du jour</Text>
                <Text style={styles.dailyCtaBody}>
                  Accepte ou refuse — si c’est mutuel, vous avez 72 h pour former le jumelo.
                </Text>
              </View>
              <View style={styles.entryCta}>
                <Text style={styles.entryCtaText}>Voir</Text>
                <Icon name="chevronRight" size={14} color="#fff" weight="bold" />
              </View>
            </LinearGradient>
          </ScalePressable>

          {Platform.OS === 'ios' ? <DiscoverAppsSection /> : null}

          <ScalePressable
            onPress={() => router.push('/categories')}
            style={[styles.categoriesPress, elevation.glow(colors.primary)]}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.categoriesCta}
            >
              <View style={styles.categoriesIcon}>
                <Icon name="spark" size={18} color={colors.white} weight="bold" />
              </View>
              <Text style={styles.categoriesLabel}>Mes catégories</Text>
              <Icon name="chevronRight" size={16} color={colors.white} weight="bold" />
            </LinearGradient>
          </ScalePressable>
        </ScrollView>

        <Modal
          visible={notifOpen}
          transparent
          animationType="slide"
          onRequestClose={closeNotifications}
        >
          <Pressable style={styles.notifBackdrop} onPress={closeNotifications}>
            <Pressable
              style={[
                styles.notifSheet,
                {
                  backgroundColor: colors.white,
                  paddingBottom: Math.max(insets.bottom, spacing.lg),
                  borderColor: colors.border,
                },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={[styles.notifHandle, { backgroundColor: colors.border }]} />
              <View style={styles.notifHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.notifTitle, { color: colors.primaryDark }]}>
                    Activité
                  </Text>
                  <Text style={[styles.notifSubtitle, { color: colors.inkMuted }]}>
                    Acceptations du jour et jumelos formés
                  </Text>
                </View>
                <Pressable
                  onPress={closeNotifications}
                  hitSlop={10}
                  accessibilityLabel="Fermer"
                >
                  <Text style={[styles.notifClose, { color: colors.primary }]}>Fermer</Text>
                </Pressable>
              </View>

              {activity.length === 0 ? (
                <ListRow
                  title="Rien pour l’instant"
                  subtitle="Les validations de propositions apparaissent ici"
                  left={<Icon name="bell" size={20} color={colors.inkMuted} />}
                  onPress={() => {
                    closeNotifications();
                    goDailyJumelo();
                  }}
                />
              ) : (
                <ScrollView
                  style={styles.notifList}
                  showsVerticalScrollIndicator={false}
                  bounces={false}
                >
                  {activity.map((item) => (
                    <ListRow
                      key={item.id}
                      title={item.text}
                      subtitle={item.time}
                      left={
                        <View style={styles.dotWrap}>
                          <View style={[styles.dot, { backgroundColor: item.color }]} />
                          {item.unread ? (
                            <View
                              style={[styles.unreadRing, { borderColor: colors.primary }]}
                            />
                          ) : null}
                        </View>
                      }
                      chevron
                      onPress={() => {
                        closeNotifications();
                        goDailyJumelo();
                      }}
                    />
                  ))}
                </ScrollView>
              )}
            </Pressable>
          </Pressable>
        </Modal>
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
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  brand: {
    fontFamily: fonts.displaySoft,
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 0,
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
  notifBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(1, 24, 103, 0.35)',
  },
  notifSheet: {
    width: '100%',
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    maxHeight: '70%',
  },
  notifHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: spacing.sm,
  },
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  notifTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    letterSpacing: -0.4,
  },
  notifSubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: 2,
  },
  notifClose: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    marginTop: 4,
  },
  notifList: {
    maxHeight: 360,
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
    flexWrap: 'wrap',
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
  entryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: spacing.xl,
  },
  entryPress: {
    flex: 1,
    borderRadius: radii.xl,
    overflow: 'hidden',
  },
  entryCard: {
    borderRadius: radii.xl,
    padding: spacing.md,
    overflow: 'hidden',
    minHeight: 188,
    gap: 6,
  },
  entryCardSoft: {
    borderWidth: 1.5,
  },
  entryIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    marginBottom: 4,
  },
  entryEyebrow: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.8)',
  },
  entryTitle: {
    fontFamily: fonts.display,
    fontSize: 26,
    letterSpacing: -0.6,
    color: '#fff',
  },
  entrySub: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 4,
    flex: 1,
  },
  entryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  entryCtaText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: '#fff',
  },
  dailyCta: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  dailyCtaTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: '#fff',
    letterSpacing: -0.4,
  },
  dailyCtaBody: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.88)',
  },
  domainRow: {
    gap: 8,
    paddingBottom: 4,
  },
  domainChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1.5,
  },
  heroDuoPress: {
    borderRadius: radii.xl,
  },
  heroDuo: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    minHeight: 120,
  },
  heroDuoTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroEyebrow: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.8)',
  },
  heroTitle: {
    fontFamily: fonts.display,
    fontSize: 24,
    letterSpacing: -0.6,
    color: '#fff',
  },
  heroSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: 'rgba(255,255,255,0.88)',
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
  categoriesPress: {
    marginTop: spacing.xl,
    borderRadius: radii.pill,
  },
  categoriesCta: {
    minHeight: 56,
    borderRadius: radii.pill,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    overflow: 'hidden',
  },
  categoriesIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoriesLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: '#fff',
    letterSpacing: 0.15,
  },
});
