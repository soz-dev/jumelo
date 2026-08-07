import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
  SlideInDown,
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
import { findInterestInCatalog, getCategory, getDominantUniverse } from '../../src/constants/catalog';
import { useAuth } from '../../src/context/AuthContext';
import { useTeams } from '../../src/context/TeamsContext';
import { useTheme } from '../../src/context/ThemeContext';
import { mockUsers, type UserProfile } from '../../src/data/mock';
import {
  Avatar,
  Icon,
  ListRow,
  SectionHeader,
  elevation,
  fonts,
  motion,
  radii,
  spacing,
  typography,
  withHexAlpha,
} from '../../src/design-system';
import { listProfiles } from '../../src/lib/api/profiles';
import {
  ensureDemoIncomingLikes,
  loadSeenActivityIds,
  markActivityIdsSeen,
  type ActivityItem,
} from '../../src/lib/likesStore';
import {
  acceptDailyJumelo,
  getDailyJumeloView,
  listIncomingDailyAccepts,
  refuseDailyJumelo,
  seedIncomingDailyAccept,
  type DailyViewModel,
} from '../../src/lib/dailyJumelo';
import { useIsAdmin } from '../../src/lib/admin';
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
  const { guard, isPremium, blocked, openPaywall, refresh: refreshPremium } = usePremiumAccess();
  const isAdmin = useIsAdmin();
  const insets = useSafeAreaInsets();
  const [pool, setPool] = useState<UserProfile[]>(mockUsers);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [unreadLikes, setUnreadLikes] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [seedHint, setSeedHint] = useState<string | null>(null);
  const [domainFilter, setDomainFilter] = useState<string | 'all'>('all');
  const [dailyView, setDailyView] = useState<DailyViewModel | null>(null);
  const [dailyBusy, setDailyBusy] = useState(false);
  const commonSubs = useMemo(() => {
    if (!dailyView?.peer || !user) return [];
    const myIds = new Set<string>([
      ...(user.subCategoryIds ?? []),
      ...(user.interests ?? []).map((i) => findInterestInCatalog(i)?.id).filter((x): x is string => Boolean(x)),
    ]);
    const peerAll = [
      ...(dailyView.peer.subCategoryIds ?? []),
      ...(dailyView.peer.interests ?? []).map((i) => findInterestInCatalog(i)?.id).filter((x): x is string => Boolean(x)),
    ];
    const seen = new Set<string>();
    return peerAll.filter((id) => {
      if (myIds.has(id) && !seen.has(id)) { seen.add(id); return true; }
      return false;
    }).slice(0, 4);
  }, [dailyView?.peer, user]);

  // Ferme juste le panneau notifications — la widget est déjà visible sur home
  const goDailyJumelo = () => setNotifOpen(false);

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

  const loadDailyView = useCallback(async () => {
    if (!user) return;
    try {
      const currentPool = pool.length ? pool : mockUsers;
      const v = await getDailyJumeloView(user, currentPool);
      setDailyView(v);
    } catch {
      // ignore
    }
  }, [user, pool]);

  const handleDailyAccept = async () => {
    if (!user || dailyBusy) return;
    setDailyBusy(true);
    try {
      const currentPool = pool.length ? pool : mockUsers;
      await acceptDailyJumelo(user, currentPool);
      await loadDailyView();
    } finally {
      setDailyBusy(false);
    }
  };

  const handleDailyRefuse = async () => {
    if (!user || dailyBusy) return;
    setDailyBusy(true);
    try {
      await refuseDailyJumelo(user.id);
      await loadDailyView();
    } finally {
      setDailyBusy(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      void refreshActivity(user.id);
      void loadDailyView();
      refreshPremium();
    }, [user, refreshActivity, loadDailyView]),
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
              <Text style={styles.brand}>
                <Text style={{ color: colors.primaryDark }}>Jum</Text><Text style={{ color: colors.primary }}>elo</Text>
              </Text>
              <Text style={[styles.headline, { color: colors.primaryDark }]}>
                Trouve{'\n'}
                <Text style={[styles.headlineAccent, { color: colors.primary }]}>ton jumelo</Text>
              </Text>
            </View>
            <View style={styles.topActions}>
              <Text style={[styles.hello, { color: colors.ink }]}>
                {firstName ? `Salut ${firstName} 👋` : 'Bienvenue'}
                {isPremium ? (
                  <Text style={[styles.premiumBadge, { color: '#c9a227' }]}>{' ✦ Premium'}</Text>
                ) : null}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {isAdmin ? (
                  <Pressable
                    onPress={() => router.push('/admin')}
                    style={[styles.notifBtn, { backgroundColor: 'rgba(255,255,255,0.72)', borderColor: colors.border }]}
                    accessibilityLabel="Administration"
                  >
                    <Icon name="shield" size={20} color={colors.inkMuted} weight="regular" />
                  </Pressable>
                ) : null}
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

          {/* ─── Jumelo du jour hero ─── */}
          <Animated.View entering={FadeInDown.delay(60).duration(380)} style={{ marginBottom: spacing.xl }}>
            <View style={styles.heroDailyTop}>
              <Text style={styles.heroDailyTitle}>
                <Text style={{ color: colors.primaryDark }}>Jumelo </Text>
                <Text style={{ color: colors.primary }}>du jour</Text>
              </Text>
              <View style={[styles.heroDailyPill, { backgroundColor: withHexAlpha(colors.primary, 0.1) }]}>
                <Text style={[styles.heroDailyPillText, { color: colors.primary }]}>24 h · match mutuel</Text>
              </View>
            </View>

            {dailyBusy ? (
              <View style={styles.heroCard}>
                <LinearGradient colors={[colors.primary, colors.primaryDark]} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={[styles.heroCardGradient, styles.heroCardStatusCenter]}>
                  <ActivityIndicator color="#fff" size="large" />
                </LinearGradient>
              </View>
            ) : dailyView?.mode === 'card' && dailyView.peer ? (
              <View style={styles.heroCard}>
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  start={{ x: 0, y: 1 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.heroCardGradient}
                >
                  <View style={styles.heroLottieDecor} pointerEvents="none">
                    <JumeloLottie name="spark" size={160} style={{ opacity: 0.1 }} />
                  </View>
                  <Pressable
                    onPress={() => router.push({ pathname: '/user/[id]', params: { id: dailyView.peer!.id, fromDaily: '1', dailyState: 'pending' } })}
                    style={styles.heroCardTop}
                  >
                    <View style={styles.heroPhotoRing}>
                      {dailyView.peer.photo ? (
                        <Image source={{ uri: dailyView.peer.photo }} style={styles.heroPhoto} />
                      ) : (
                        <Avatar name={dailyView.peer.name} color={withHexAlpha('#fff', 0.3)} size={92} />
                      )}
                    </View>
                    <View style={styles.heroCardInfo}>
                      <Text style={styles.heroCardName} numberOfLines={1}>
                        {dailyView.peer.name}{dailyView.peer.age ? `, ${dailyView.peer.age}` : ''}
                      </Text>
                      {dailyView.peer.city ? <Text style={styles.heroCardCity}>{dailyView.peer.city}</Text> : null}
                      <View style={styles.heroCompatBox}>
                        <Text style={styles.heroCompatPct}>{dailyView.score}%</Text>
                        <Text style={styles.heroCompatLabel}>{'de points\ncommuns'}</Text>
                      </View>
                    </View>
                  </Pressable>
                  {commonSubs.length > 0 ? (
                    <View style={styles.heroChipsRow}>
                      {commonSubs.map((subId) => (
                        <View key={subId} style={styles.heroChip}>
                          <Text style={styles.heroChipText} numberOfLines={1}>{findInterestInCatalog(subId)?.label ?? subId}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                  <View style={styles.heroCardDivider} />
                  <View style={styles.heroCardActions}>
                    <Pressable onPress={() => void handleDailyRefuse()} style={styles.heroBtnRefuse}>
                      <Text style={styles.heroBtnRefuseText}>✕ Passer</Text>
                    </Pressable>
                    <Pressable onPress={() => void handleDailyAccept()} style={[styles.heroBtnAccept, { backgroundColor: '#fff' }]}>
                      <Text style={[styles.heroBtnAcceptText, { color: colors.primaryDark }]}>✓ Jumelo !</Text>
                    </Pressable>
                  </View>
                </LinearGradient>
              </View>
            ) : dailyView?.mode === 'waiting_peer' ? (
              <Pressable
                style={styles.heroCard}
                onPress={() => dailyView.peer && router.push({ pathname: '/user/[id]', params: { id: dailyView.peer.id, fromDaily: '1', dailyState: 'accepted' } })}
              >
                <LinearGradient colors={['#16a34a', '#15803d']} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={[styles.heroCardGradient, styles.heroCardStatusCenter]}>
                  <View style={styles.heroLottieDecor} pointerEvents="none">
                    <JumeloLottie name="spark" size={140} style={{ opacity: 0.08 }} />
                  </View>
                  <View style={styles.heroPhotoRing}>
                    {dailyView.peer?.photo ? (<Image source={{ uri: dailyView.peer.photo }} style={styles.heroPhoto} />) : (<Avatar name={dailyView.peer?.name ?? '?'} color={withHexAlpha('#fff', 0.3)} size={92} />)}
                  </View>
                  <Text style={[styles.heroCardName, { marginTop: spacing.sm }]}>{dailyView.peer?.name ?? '?'} ✓</Text>
                  <Text style={styles.heroCardCityCenter}>En attente de sa réponse</Text>
                  <Icon name="chevronRight" size={18} color="rgba(255,255,255,0.5)" style={{ marginTop: 8 }} />
                </LinearGradient>
              </Pressable>
            ) : dailyView?.mode === 'trial' ? (
              <Pressable
                style={styles.heroCard}
                onPress={() => {
                  const pid = dailyView.peer?.id ?? dailyView.proposal?.peerId ?? '';
                  const cid = dailyView.trial?.conversationId ?? '';
                  router.push({ pathname: '/match/choose-sub', params: { peerId: pid, conversationId: cid } });
                }}
              >
                <LinearGradient colors={['#16a34a', '#15803d']} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={[styles.heroCardGradient, styles.heroCardStatusCenter]}>
                  <View style={styles.heroLottieDecor} pointerEvents="none">
                    <JumeloLottie name="spark" size={140} style={{ opacity: 0.08 }} />
                  </View>
                  <View style={styles.heroPhotoRing}>
                    {dailyView.peer?.photo ? (<Image source={{ uri: dailyView.peer.photo }} style={styles.heroPhoto} />) : (<Avatar name={dailyView.peer?.name ?? '?'} color={withHexAlpha('#fff', 0.3)} size={92} />)}
                  </View>
                  <Text style={[styles.heroCardName, { marginTop: spacing.sm }]}>Match !  {dailyView.peer?.name ?? '?'} ✓</Text>
                  <Text style={styles.heroCardCityCenter}>
                    {dailyView.score}% · {getCategory(getDominantUniverse(dailyView.peer?.universes ?? [], dailyView.peer?.subCategoryIds) as any)?.shortLabel ?? 'Jumelo'}
                  </Text>
                  <View style={[styles.heroBtnAccept, { backgroundColor: 'rgba(255,255,255,0.16)', marginTop: 16 }]}>
                    <Text style={[styles.heroBtnAcceptText, { color: '#fff' }]}>Choisir une activité →</Text>
                  </View>
                </LinearGradient>
              </Pressable>
            ) : dailyView?.mode === 'formed' ? (
              <Pressable style={styles.heroCard} onPress={() => router.push('/(tabs)/teams')}>
                <LinearGradient colors={['#16a34a', '#15803d']} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={[styles.heroCardGradient, styles.heroCardStatusCenter]}>
                  <View style={styles.heroLottieDecor} pointerEvents="none">
                    <JumeloLottie name="confetti" size={200} style={{ opacity: 0.18 }} />
                  </View>
                  <Text style={{ fontSize: 52, marginBottom: 8 }}>🎉</Text>
                  <Text style={styles.heroCardName}>Jumelo formé !</Text>
                  <Text style={styles.heroCardCityCenter}>Retrouve-le dans Lobby</Text>
                  <View style={[styles.heroBtnAccept, { backgroundColor: 'rgba(255,255,255,0.16)', marginTop: 16 }]}>
                    <Text style={[styles.heroBtnAcceptText, { color: '#fff' }]}>Voir le Lobby →</Text>
                  </View>
                </LinearGradient>
              </Pressable>
            ) : dailyView?.mode === 'cooldown' && dailyView.peer ? (
              <View style={styles.heroCard}>
                <LinearGradient
                  colors={dailyView.decision === 'refused' ? ['#991b1b', '#7f1d1d'] : ['#16a34a', '#15803d']}
                  start={{ x: 0, y: 1 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.heroCardGradient, styles.heroCardStatusCenter]}
                >
                  <View style={styles.heroPhotoRing}>
                    {dailyView.peer.photo ? (<Image source={{ uri: dailyView.peer.photo }} style={styles.heroPhoto} />) : (<Avatar name={dailyView.peer.name} color={withHexAlpha('#fff', 0.3)} size={92} />)}
                  </View>
                  <Text style={[styles.heroCardName, { marginTop: spacing.sm }]}>
                    {dailyView.peer.name} {dailyView.decision === 'refused' ? '✕' : '✓'}
                  </Text>
                  <Text style={styles.heroCardCityCenter}>
                    {dailyView.decision === 'refused'
                      ? `Prochain jumelo dans ${Math.ceil(dailyView.msUntilLockEnd / 3_600_000)}h`
                      : 'En attente de sa réponse'}
                  </Text>
                </LinearGradient>
              </View>
            ) : (
              <View style={styles.heroCard}>
                <LinearGradient
                  colors={[withHexAlpha(colors.primary, 0.55), withHexAlpha(colors.primaryDark, 0.65)]}
                  start={{ x: 0, y: 1 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.heroCardGradient, styles.heroCardStatusCenter]}
                >
                  <JumeloLottie name="spark" size={72} style={{ opacity: 0.5, marginBottom: 8 }} />
                  <Text style={styles.heroCardName}>Aucune proposition</Text>
                  <Text style={styles.heroCardCityCenter}>Reviens dans 24 h</Text>
                </LinearGradient>
              </View>
            )}
          </Animated.View>

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
                  <Icon name="mentorat" size={26} color="#fff" weight="fill" />
                </View>
                <Text style={styles.entryEyebrow}>Recommandé</Text>
                <Text style={styles.entryTitle}>
                  <Text style={{ color: '#fff' }}>Ton </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.72)' }}>duo</Text>
                </Text>
                <Text style={styles.entrySub}>Binômes existants + créer le tien</Text>
                <View style={styles.entryCta}>
                  <Text style={styles.entryCtaText}>Voir les duos</Text>
                  <Icon name="chevronRight" size={14} color="#fff" weight="bold" />
                </View>
              </LinearGradient>
            </ScalePressable>

            <ScalePressable
              onPress={() =>
                blocked
                  ? openPaywall()
                  : router.push({ pathname: '/(tabs)/teams', params: { format: 'groupes' } })
              }
              style={styles.entryPress}
            >
              <View
                style={[
                  styles.entryCard,
                  styles.entryCardSoft,
                  {
                    backgroundColor: blocked ? 'transparent' : colors.white,
                    borderColor: blocked ? '#c9861a' : colors.border,
                  },
                ]}
              >
                {blocked ? (
                  <LinearGradient
                    colors={['#f5c518', '#e8700a']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[StyleSheet.absoluteFillObject, { borderRadius: radii.xl }]}
                  />
                ) : null}
                <View
                  style={[
                    styles.entryIconWrap,
                    { backgroundColor: blocked ? 'rgba(255,255,255,0.22)' : colors.primarySoft },
                  ]}
                >
                  <Icon name="teams" size={26} color={blocked ? '#fff' : colors.primaryDark} weight="fill" />
                </View>
                <Text style={[styles.entryEyebrow, { color: blocked ? 'rgba(255,255,255,0.8)' : colors.inkMuted }]}>
                  {blocked ? '✦ Premium' : 'Annexe'}
                </Text>
                <Text style={styles.entryTitle}>
                  <Text style={{ color: blocked ? '#fff' : colors.primaryDark }}>Ton </Text>
                  <Text style={{ color: blocked ? 'rgba(255,255,255,0.78)' : colors.primary }}>équipe</Text>
                </Text>
                <Text style={[styles.entrySub, { color: blocked ? 'rgba(255,255,255,0.72)' : colors.inkMuted }]}>
                  {blocked ? 'Réservé aux membres Premium' : 'Groupes 3+ existants + en créer un'}
                </Text>
                <View style={[styles.entryCta, { backgroundColor: blocked ? 'rgba(255,255,255,0.18)' : colors.primarySoft }]}>
                  <Text style={[styles.entryCtaText, { color: blocked ? '#fff' : colors.primaryDark }]}>
                    {blocked ? 'Débloquer Premium' : 'Voir les équipes'}
                  </Text>
                  <Icon name={blocked ? 'lock' : 'chevronRight'} size={14} color={blocked ? '#fff' : colors.primaryDark} weight="bold" />
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

          <DiscoverAppsSection />
        </ScrollView>

        <Modal
          visible={notifOpen}
          transparent
          animationType="none"
          onRequestClose={closeNotifications}
        >
          <Pressable style={styles.notifBackdrop} onPress={closeNotifications}>
            <Animated.View entering={SlideInDown.springify().damping(80).stiffness(250)} style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
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
            </Animated.View>
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
  topActions: { flexDirection: 'column', alignItems: 'flex-end', gap: 6 },
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
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    letterSpacing: -0.2,
    textAlign: 'right',
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
  dailyCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
    justifyContent: 'center',
    minHeight: 70,
  },
  dailyPeerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dailyPeerPhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  dailyPeerName: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    letterSpacing: -0.2,
  },
  dailyPeerMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
  dailyActions: {
    flexDirection: 'row',
    gap: 8,
  },
  dailyActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dailyStatusBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
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
  heroDailyTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  heroDailyTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    letterSpacing: -0.5,
  },
  heroDailyPill: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroDailyPillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.2,
  },
  heroCard: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  heroCardGradient: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  heroCardStatusCenter: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  heroLottieDecor: {
    position: 'absolute',
    bottom: -10,
    right: -10,
  },
  heroCardTop: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  heroPhotoRing: {
    borderRadius: 50,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.4)',
    overflow: 'hidden',
  },
  heroPhoto: {
    width: 92,
    height: 92,
    borderRadius: 46,
  },
  heroCardInfo: {
    flex: 1,
    gap: 2,
  },
  heroCardName: {
    fontFamily: fonts.displaySemi,
    fontSize: 21,
    color: '#fff',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  heroCardCity: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  heroCardCityCenter: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    marginTop: 4,
  },
  heroCompatBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 10,
  },
  heroCompatPct: {
    fontFamily: fonts.display,
    fontSize: 36,
    color: '#fff',
    letterSpacing: -1.2,
  },
  heroCompatLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 14,
  },
  heroChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.md,
  },
  heroChip: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  heroChipText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: '#fff',
  },
  heroCardDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: spacing.md,
  },
  heroCardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  heroBtnRefuse: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
  },
  heroBtnRefuseText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: 'rgba(255,255,255,0.65)',
  },
  heroBtnAccept: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  heroBtnAcceptText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  premiumBadge: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.3,
  },

});
