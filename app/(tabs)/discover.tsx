import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Atmosphere } from '../../src/components/Atmosphere';
import { CommonPointsBlock } from '../../src/components/CommonPointsBlock';
import { ThemeSwitcherButton } from '../../src/components/ThemeSwitcher';
import { getCategory } from '../../src/constants/catalog';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { mockUsers, type UserProfile } from '../../src/data/mock';
import {
  Avatar,
  CategoryPill,
  elevation,
  fonts,
  motion,
  radii,
  spacing,
  withHexAlpha,
} from '../../src/design-system';
import { listProfiles } from '../../src/lib/api/profiles';
import { getCommonPoints } from '../../src/lib/commonPoints';
import {
  acceptDailyJumelo,
  dismissDailyOutcome,
  ensureDailyTrialConversation,
  formatRemaining,
  getDailyJumeloView,
  refuseDailyJumelo,
  type DailyViewModel,
} from '../../src/lib/dailyJumelo';
import { computeMatch } from '../../src/lib/matching';
import { openChatWithUser } from '../../src/lib/users';

const { height: SCREEN_H } = Dimensions.get('window');
const WASH_TRAVEL = Math.max(80, SCREEN_H * 0.22);

type CardTone = 'idle' | 'refused' | 'accepted';

export default function DiscoverScreen() {
  const { user, usingSupabase } = useAuth();
  const { colors } = useTheme();
  const [pool, setPool] = useState<UserProfile[]>(mockUsers);
  const [view, setView] = useState<DailyViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  /** Peer figé pendant l’anim de décision. */
  const [flashPeer, setFlashPeer] = useState<UserProfile | null>(null);
  /** Joue l’intro animée (refus / accept) avant l’état persisté. */
  const [playIntro, setPlayIntro] = useState(false);
  const [localTone, setLocalTone] = useState<CardTone | null>(null);

  /** Évite que chaque nouvelle identité `user` relance useFocusEffect → refresh → setState en boucle. */
  const userRef = useRef(user);
  userRef.current = user;
  const userId = user?.id ?? null;
  const refreshSeq = useRef(0);
  const hasLoadedRef = useRef(false);

  const loadPool = useCallback(async () => {
    const current = userRef.current;
    if (
      !usingSupabase ||
      !current ||
      current.id.startsWith('u-') ||
      current.id.startsWith('fb-')
    ) {
      setPool((prev) => (prev === mockUsers ? prev : mockUsers));
      return mockUsers;
    }
    const remote = await listProfiles(current.id);
    const next = remote.length ? remote : mockUsers;
    setPool(next);
    return next;
  }, [usingSupabase]);

  const refresh = useCallback(async () => {
    const current = userRef.current;
    const seq = ++refreshSeq.current;
    if (!current) {
      hasLoadedRef.current = false;
      setView(null);
      setLoading(false);
      return;
    }
    // Soft refresh : ne pas démonter PeerCard (évite storm Reanimated sur le web).
    if (!hasLoadedRef.current) setLoading(true);
    try {
      const p = await loadPool();
      if (seq !== refreshSeq.current) return;
      const v = await getDailyJumeloView(current, p);
      if (seq !== refreshSeq.current) return;
      setView(v);
      hasLoadedRef.current = true;
      if (v.mode === 'card' || v.mode === 'empty') {
        setFlashPeer(null);
        setLocalTone(null);
        setPlayIntro(false);
      }
    } finally {
      if (seq === refreshSeq.current) setLoading(false);
    }
  }, [loadPool]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        if (!active) return;
        await refresh();
      })();
      return () => {
        active = false;
        refreshSeq.current += 1;
      };
    }, [refresh, userId]),
  );

  useEffect(() => {
    if (!view) return;
    const needsTick =
      view.mode === 'cooldown' ||
      view.mode === 'trial' ||
      view.mode === 'waiting_peer' ||
      Boolean(view.lockUntil || view.cooldownUntil);
    if (!needsTick) return;
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, [view?.mode, view?.lockUntil, view?.cooldownUntil]);

  void tick;

  const onRefuse = async () => {
    if (!user || busy || !view?.peer) return;
    setBusy(true);
    setFlashPeer(view.peer);
    setLocalTone('refused');
    setPlayIntro(true);
    try {
      await refuseDailyJumelo(user.id);
      // Laisse l’anim jouer (~520ms) avant le refresh d’état
      await new Promise((r) => setTimeout(r, 560));
      await refresh();
      setPlayIntro(false);
    } finally {
      setBusy(false);
    }
  };

  const onAccept = async () => {
    if (!user || busy || !view?.peer) return;
    setBusy(true);
    setFlashPeer(view.peer);
    setLocalTone('accepted');
    setPlayIntro(true);
    try {
      const p = pool.length ? pool : await loadPool();
      const result = await acceptDailyJumelo(user, p);
      await new Promise((r) => setTimeout(r, 560));
      await refresh();
      setPlayIntro(false);
      // Mutuel : rester sur la carte verte + CTA chat (pas de « formé » solo)
      if (result.mutual && result.conversationId) {
        // Optionnel : ne pas auto-ouvrir — l’utilisateur choisit « Ouvrir le chat »
      }
    } finally {
      setBusy(false);
    }
  };

  const onOpenChat = async () => {
    if (!user || !view?.peer || busy) return;
    setBusy(true);
    try {
      const healed = await ensureDailyTrialConversation(user.id);
      if (healed) {
        router.push(`/chat/${healed}`);
        return;
      }
      if (view.trial?.conversationId) {
        router.push(`/chat/${view.trial.conversationId}`);
        return;
      }
      const path = await openChatWithUser(user.id, view.peer.id);
      router.push(path);
    } finally {
      setBusy(false);
    }
  };

  const onDismissOutcome = async () => {
    if (!user || busy) return;
    setBusy(true);
    try {
      await dismissDailyOutcome(user.id);
      setFlashPeer(null);
      setLocalTone(null);
      setPlayIntro(false);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const peer = flashPeer ?? view?.peer ?? null;
  const common =
    user && peer && view?.mode === 'card' && !localTone
      ? getCommonPoints(user, peer).slice(0, 4)
      : [];
  const lockMs = view?.lockUntil
    ? Math.max(0, new Date(view.lockUntil).getTime() - Date.now())
    : view?.msUntilLockEnd ?? view?.msUntilCooldownEnd ?? 0;
  const lockLabel = formatRemaining(lockMs);
  const trialLabel = formatRemaining(
    view?.trial
      ? Math.max(0, new Date(view.trial.endsAt).getTime() - Date.now())
      : view?.msUntilTrialEnd ?? 0,
  );

  const locked = lockMs > 0;
  const persistedRefused =
    view?.mode === 'cooldown' || (view?.decision === 'refused' && locked);
  const persistedAccepted =
    !persistedRefused &&
    view?.decision === 'accepted' &&
    (locked || view?.mode === 'waiting_peer' || view?.mode === 'trial');

  const mode = view?.mode;
  const tone: CardTone =
    localTone ??
    (persistedRefused || (flashPeer && mode === 'cooldown')
      ? 'refused'
      : persistedAccepted
        ? 'accepted'
        : 'idle');

  const stampLabel =
    tone === 'refused' ? 'NON RETENU' : mode === 'trial' ? 'VALIDÉ' : 'RETENU';

  const choiceLocked = tone !== 'idle' || mode !== 'card' || Boolean(flashPeer);
  const showWaitingFooter =
    mode === 'waiting_peer' || (localTone === 'accepted' && mode !== 'trial');

  const subtitle = (() => {
    if (!mode) return 'Une proposition · 24 h · accepte ou refuse';
    if (mode === 'formed') return 'Binôme confirmé · voici vos points communs';
    if (tone === 'refused' || mode === 'cooldown') {
      return `Prochaine proposition dans ${lockLabel}`;
    }
    if (mode === 'trial') {
      return locked
        ? `Match mutuel · chat ouvert · prochaine prop. dans ${lockLabel}`
        : `${trialLabel} pour former l’équipe`;
    }
    if (mode === 'waiting_peer' || tone === 'accepted') {
      return locked
        ? `Retenu — en attente de sa réponse · ${lockLabel}`
        : 'Retenu — en attente de sa réponse';
    }
    return 'Une proposition · 24 h · accepte ou refuse';
  })();

  const formedMatch =
    user && peer && mode === 'formed' ? computeMatch(user, peer) : null;
  const formedPoints =
    user && peer && mode === 'formed' ? getCommonPoints(user, peer) : [];
  const peerFirst = peer?.name.split(' ')[0] ?? '';

  return (
    <Atmosphere variant="bold">
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.topBar}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.primaryDark }]}>Jumelo du jour</Text>
            <Text style={[styles.subtitle, { color: colors.inkMuted }]}>{subtitle}</Text>
          </View>
          <ThemeSwitcherButton />
        </View>

        {loading || !view ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : view.mode === 'empty' ? (
          <View style={styles.centerPad}>
            <Animated.View entering={FadeInDown.duration(380)} style={[styles.waitHero]}>
              <View style={[styles.waitCircle, { backgroundColor: withHexAlpha(colors.primary, 0.1) }]}>
                <Ionicons name="search-outline" size={38} color={colors.primary} />
              </View>
              <Text style={[styles.waitTitle, { color: colors.ink }]}>Aucun profil pour l'instant</Text>
              <Text style={[styles.waitBody, { color: colors.inkMuted }]}>
                Élargis tes intérêts dans ton profil — on te propose quelqu'un dès qu'il y a un bon match.
              </Text>
            </Animated.View>
            <Animated.View
              entering={FadeInDown.delay(100).duration(360)}
              style={[styles.waitTips, { backgroundColor: colors.white, borderColor: withHexAlpha(colors.primary, 0.1) }]}
            >
              <Pressable onPress={() => router.push('/settings/index')} style={styles.waitTipRow}>
                <Ionicons name="options-outline" size={20} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.waitTipLabel, { color: colors.ink }]}>Affiner mes intérêts</Text>
                  <Text style={[styles.waitTipSub, { color: colors.inkMuted }]}>Profil → univers et activités</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.inkMuted} />
              </Pressable>
            </Animated.View>
          </View>
        ) : view.mode === 'formed' && peer ? (
          <ScrollView
            style={styles.formedScroll}
            contentContainerStyle={styles.formedContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View entering={FadeInDown.duration(360)} style={styles.formedHeader}>
              <View
                style={[
                  styles.formedAvatarRing,
                  {
                    borderColor: withHexAlpha(colors.primary, 0.28),
                    backgroundColor: colors.white,
                  },
                ]}
              >
                <Avatar
                  name={peer.name}
                  photo={peer.photo}
                  personaId={peer.avatarPersonaId}
                  color={peer.avatarColor}
                  size={64}
                />
              </View>
              <Text style={[styles.formedTitle, { color: colors.ink }]}>Jumelo formé</Text>
              <Text style={[styles.formedBody, { color: colors.inkMuted }]}>
                Toi et {peerFirst} êtes binômes. Ce qui compte, ce sont vos points communs.
              </Text>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(90).duration(360)}
              style={[
                styles.formedPointsCard,
                {
                  backgroundColor: colors.white,
                  borderColor: withHexAlpha(colors.primary, 0.12),
                },
                elevation.soft,
              ]}
            >
              <CommonPointsBlock
                points={formedPoints}
                score={formedMatch?.score ?? view.score}
                reasons={formedMatch?.reasons}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(160).duration(360)} style={{ width: '100%' }}>
              <Pressable
                onPress={() => {
                  const teamId = view.trial?.teamId;
                  void onDismissOutcome();
                  if (teamId) router.push(`/jumelo/${teamId}`);
                  else router.push('/(tabs)/home');
                }}
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.primaryLabel}>Voir mon jumelo</Text>
              </Pressable>
            </Animated.View>
          </ScrollView>
        ) : view.mode === 'rejected' ? (
          <View style={styles.centerPad}>
            <Animated.View entering={FadeInDown.duration(380)} style={styles.waitHero}>
              <View style={[styles.waitCircle, { backgroundColor: withHexAlpha(colors.accent, 0.1) }]}>
                <Ionicons name="close-circle-outline" size={38} color={colors.accent} />
              </View>
              <Text style={[styles.waitTitle, { color: colors.ink }]}>Tentative terminée</Text>
              <Text style={[styles.waitBody, { color: colors.inkMuted }]}>
                Les 72 h sont passées sans double validation. Une nouvelle proposition arrive bientôt.
              </Text>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(100).duration(360)}>
              <Pressable
                onPress={onDismissOutcome}
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.primaryLabel}>Continuer</Text>
              </Pressable>
            </Animated.View>
          </View>
        ) : peer ? (
          <View style={styles.stage}>
            <PeerCard
              peer={peer}
              score={view.score}
              colors={colors}
              common={common}
              tone={tone}
              stampLabel={stampLabel}
              playIntro={playIntro}
              onOpenProfile={
                mode === 'card' && !choiceLocked
                  ? () => router.push(`/user/${peer.id}`)
                  : undefined
              }
            />

            {mode === 'card' && !choiceLocked ? (
              <View style={styles.actions}>
                <Pressable
                  onPress={onRefuse}
                  disabled={busy}
                  style={[styles.roundBtn, styles.refuseBtn]}
                  accessibilityLabel="Refuser"
                >
                  <Ionicons name="close" size={32} color="#EF4444" />
                </Pressable>
                <Pressable
                  onPress={onAccept}
                  disabled={busy}
                  style={[
                    styles.roundBtn,
                    styles.acceptBtn,
                    { backgroundColor: colors.primary },
                  ]}
                  accessibilityLabel="Accepter"
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Ionicons name="heart" size={30} color="#fff" />
                  )}
                </Pressable>
              </View>
            ) : null}

            {showWaitingFooter ? (
              <Text style={[styles.footerHint, { color: colors.inkMuted }]}>
                Tu as retenu {peer.name.split(' ')[0]} — ce n’est pas encore un jumelo.
                {'\n'}
                {peer.name.split(' ')[0]} doit aussi accepter pour ouvrir le chat.
                {locked ? `\nProchaine proposition dans ${lockLabel}.` : ''}
              </Text>
            ) : null}

            {mode === 'trial' ? (
              <Pressable
                onPress={onOpenChat}
                disabled={busy}
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.primaryLabel}>Ouvrir le chat · {trialLabel}</Text>
              </Pressable>
            ) : null}

            {tone === 'refused' || mode === 'cooldown' ? (
              <Text style={[styles.footerHint, { color: colors.inkMuted }]}>
                Non retenu — prochaine proposition dans {lockLabel}.
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.centerPad}>
            <Animated.View entering={FadeInDown.duration(400)} style={styles.waitHero}>
              <View style={[styles.waitCircle, { backgroundColor: withHexAlpha(colors.primary, 0.1) }]}>
                <Ionicons name="hourglass-outline" size={38} color={colors.primary} />
              </View>
              <Text style={[styles.waitTitle, { color: colors.ink }]}>Prochain jumelo</Text>
              {lockMs > 0 ? (
                <Text style={[styles.waitCountdown, { color: colors.primary }]}>{lockLabel}</Text>
              ) : null}
              <Text style={[styles.waitBody, { color: colors.inkMuted }]}>
                Une seule proposition par 24 h — pour que chaque match compte vraiment.
              </Text>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(120).duration(400)}
              style={[
                styles.waitTips,
                { backgroundColor: colors.white, borderColor: withHexAlpha(colors.primary, 0.1) },
              ]}
            >
              <Pressable
                onPress={() => router.push('/(tabs)/teams')}
                style={styles.waitTipRow}
              >
                <Ionicons name="people-outline" size={20} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.waitTipLabel, { color: colors.ink }]}>Rejoins un jumelo existant</Text>
                  <Text style={[styles.waitTipSub, { color: colors.inkMuted }]}>Lobby → trouver une équipe</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.inkMuted} />
              </Pressable>
              <View style={[styles.waitDivider, { backgroundColor: withHexAlpha(colors.ink, 0.06) }]} />
              <Pressable
                onPress={() => router.push('/(tabs)/profile')}
                style={styles.waitTipRow}
              >
                <Ionicons name="person-outline" size={20} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.waitTipLabel, { color: colors.ink }]}>Améliore ton profil</Text>
                  <Text style={[styles.waitTipSub, { color: colors.inkMuted }]}>Plus de détails = meilleur match</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.inkMuted} />
              </Pressable>
            </Animated.View>
          </View>
        )}
      </SafeAreaView>
    </Atmosphere>
  );
}

function StatusBlock({
  colors,
  icon,
  title,
  body,
}: {
  colors: { primary: string; ink: string; inkMuted: string; white: string };
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}) {
  return (
    <View
      style={[
        styles.statusCard,
        {
          backgroundColor: colors.white,
          borderColor: withHexAlpha(colors.primary, 0.12),
        },
        elevation.soft,
      ]}
    >
      <Ionicons name={icon} size={28} color={colors.primary} />
      <Text style={[styles.statusTitle, { color: colors.ink }]}>{title}</Text>
      <Text style={[styles.statusBody, { color: colors.inkMuted }]}>{body}</Text>
    </View>
  );
}

function PeerCard({
  peer,
  score,
  colors,
  common,
  tone,
  stampLabel,
  playIntro,
  onOpenProfile,
}: {
  peer: UserProfile;
  score: number;
  colors: {
    primary: string;
    primaryDark: string;
    ink: string;
    inkMuted: string;
    white: string;
  };
  common: ReturnType<typeof getCommonPoints>;
  tone: CardTone;
  stampLabel: string;
  playIntro: boolean;
  onOpenProfile?: () => void;
}) {
  const washProgress = useSharedValue(tone === 'idle' ? 0 : 1);
  const washRise = useSharedValue(tone === 'idle' || playIntro ? 1 : 0);
  const photoDim = useSharedValue(1);
  const stampScale = useSharedValue(tone === 'idle' ? 0.4 : 1);
  const stampOpacity = useSharedValue(tone === 'idle' ? 0 : 1);
  const stampRotate = useSharedValue(tone === 'refused' ? -18 : -8);
  const cardScale = useSharedValue(1);
  const springCfg = motion.spring;

  useEffect(() => {
    const values = [
      washProgress,
      washRise,
      photoDim,
      stampScale,
      stampOpacity,
      stampRotate,
      cardScale,
    ];
    values.forEach((v) => cancelAnimation(v));

    if (tone === 'idle') {
      washProgress.value = withTiming(0, { duration: 200 });
      washRise.value = 1;
      photoDim.value = withTiming(1, { duration: 200 });
      stampOpacity.value = withTiming(0, { duration: 160 });
      stampScale.value = 0.4;
      cardScale.value = withSpring(1, springCfg);
      return () => values.forEach((v) => cancelAnimation(v));
    }

    const isRefuse = tone === 'refused';
    const targetDim = isRefuse ? 0.42 : 0.7;
    const targetRotate = isRefuse ? -12 : -10;

    if (playIntro) {
      washRise.value = 1;
      washProgress.value = 0;
      stampOpacity.value = 0;
      stampScale.value = isRefuse ? 1.45 : 0.35;
      stampRotate.value = isRefuse ? -22 : 8;
      cardScale.value = 1;

      washRise.value = withTiming(0, {
        duration: isRefuse ? 480 : 420,
        easing: Easing.out(Easing.cubic),
      });
      washProgress.value = withTiming(1, {
        duration: isRefuse ? 480 : 420,
        easing: Easing.out(Easing.cubic),
      });
      photoDim.value = withTiming(targetDim, {
        duration: 420,
        easing: Easing.out(Easing.quad),
      });
      cardScale.value = withTiming(isRefuse ? 0.965 : 1.03, { duration: 150 }, (finished) => {
        if (finished) {
          cardScale.value = withSpring(1, springCfg);
        }
      });

      stampOpacity.value = withDelay(
        140,
        withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) }),
      );
      stampScale.value = withDelay(
        120,
        withSpring(1, { damping: isRefuse ? 14 : 11, stiffness: isRefuse ? 200 : 240 }),
      );
      stampRotate.value = withDelay(
        120,
        withSpring(targetRotate, { damping: 16, stiffness: 180 }),
      );
    } else {
      // État persisté (reload) : valeurs finales sans enchaîner des springs (web-safe).
      washRise.value = 0;
      washProgress.value = 1;
      photoDim.value = targetDim;
      stampOpacity.value = 1;
      stampScale.value = 1;
      stampRotate.value = targetRotate;
      cardScale.value = 1;
    }

    return () => values.forEach((v) => cancelAnimation(v));
  }, [tone, playIntro]);

  const washStyle = useAnimatedStyle(() => ({
    opacity: washProgress.value,
    transform: [
      {
        translateY: interpolate(washRise.value, [0, 1], [0, WASH_TRAVEL]),
      },
    ],
  }));

  const photoStyle = useAnimatedStyle(() => ({
    opacity: photoDim.value,
  }));

  const stampStyle = useAnimatedStyle(() => ({
    opacity: stampOpacity.value,
    transform: [
      { scale: stampScale.value },
      { rotate: `${stampRotate.value}deg` },
    ],
  }));

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const washColor =
    tone === 'refused' ? 'rgba(40,45,55,0.62)' : 'rgba(16, 120, 72, 0.48)';
  const stampBorder = tone === 'refused' ? '#EF4444' : '#22C55E';
  const stampText = tone === 'refused' ? '#EF4444' : '#22C55E';
  const lockedLook = tone !== 'idle';

  return (
    <Animated.View style={[styles.card, elevation.lift, cardAnimStyle]}>
      <Pressable
        onPress={onOpenProfile}
        disabled={!onOpenProfile}
        style={styles.cardPress}
      >
        <Animated.View style={[styles.photoWrap, photoStyle]}>
          <ImageBackground
            source={{
              uri:
                peer.photo ??
                `https://ui-avatars.com/api/?name=${encodeURIComponent(peer.name)}&background=2F6BFF&color=fff&size=800`,
            }}
            style={styles.photo}
          >
            {/* Toujours monté : évite mount/unmount Animated ↔ worklets en boucle sur le web. */}
            <Animated.View
              pointerEvents="none"
              style={[styles.toneWash, { backgroundColor: washColor }, washStyle]}
            />

            <Animated.View
              pointerEvents="none"
              style={[styles.stamp, { borderColor: stampBorder }, stampStyle]}
            >
              <Text style={[styles.stampText, { color: stampText }]}>{stampLabel}</Text>
            </Animated.View>

            {!lockedLook ? (
              <View style={[styles.scorePill, { backgroundColor: colors.primary }]}>
                <Text style={styles.scoreText}>{Math.round(score)}%</Text>
              </View>
            ) : null}

            <LinearGradient
              colors={['transparent', 'rgba(10,20,40,0.92)']}
              locations={[0.35, 1]}
              style={styles.photoGrad}
            >
              <Text
                style={[
                  styles.photoName,
                  tone === 'refused' ? styles.photoNameMuted : null,
                  tone === 'accepted' ? styles.photoNameAccepted : null,
                ]}
              >
                {peer.name}
                {peer.age ? `, ${peer.age}` : ''}
              </Text>
              <Text style={styles.photoMeta}>
                {[peer.city, peer.level].filter(Boolean).join(' · ')}
              </Text>

              {peer.bio && !lockedLook ? (
                <Text style={styles.bioOnPhoto} numberOfLines={2}>
                  {peer.bio}
                </Text>
              ) : null}

              {!lockedLook && peer.universes?.length ? (
                <View style={styles.pills}>
                  {peer.universes.slice(0, 3).map((u) => {
                    const cat = getCategory(u);
                    return (
                      <CategoryPill
                        key={u}
                        universeId={u}
                        label={cat?.shortLabel ?? u}
                        color={cat?.color ?? colors.primary}
                      />
                    );
                  })}
                </View>
              ) : null}

              {!lockedLook && common.length ? (
                <Text style={styles.commonLine} numberOfLines={1}>
                  En commun · {common.map((c) => c.label).join(' · ')}
                </Text>
              ) : null}
            </LinearGradient>
          </ImageBackground>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  title: {
    fontFamily: fonts.displaySemi,
    fontSize: 30,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: 2,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerPad: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    gap: spacing.md,
  },
  formedScroll: { flex: 1 },
  formedContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    justifyContent: 'center',
    gap: spacing.md,
  },
  formedHeader: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  formedAvatarRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formedTitle: {
    fontFamily: fonts.display,
    fontSize: 26,
    letterSpacing: -0.5,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  formedBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  formedPointsCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.xs,
  },
  stage: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  card: {
    flex: 1,
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: '#12151A',
    minHeight: Math.min(SCREEN_H * 0.62, 560),
  },
  cardPress: { flex: 1 },
  photoWrap: { flex: 1 },
  photo: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: '#1B2A4A',
  },
  toneWash: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3,
  },
  stamp: {
    position: 'absolute',
    top: '36%',
    alignSelf: 'center',
    left: 28,
    right: 28,
    zIndex: 6,
    borderWidth: 4,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center',
  },
  stampText: {
    fontFamily: fonts.display,
    fontSize: 28,
    letterSpacing: 1.2,
  },
  photoGrad: {
    padding: spacing.lg,
    paddingTop: 100,
    gap: 6,
    zIndex: 4,
  },
  photoName: {
    color: '#fff',
    fontFamily: fonts.display,
    fontSize: 30,
    letterSpacing: -0.5,
  },
  photoNameMuted: {
    color: 'rgba(255,255,255,0.7)',
  },
  photoNameAccepted: {
    color: 'rgba(220,255,230,0.95)',
  },
  photoMeta: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: fonts.body,
    fontSize: 14,
  },
  bioOnPhoto: {
    color: 'rgba(255,255,255,0.88)',
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  scorePill: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    zIndex: 2,
  },
  scoreText: {
    color: '#fff',
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  commonLine: {
    color: 'rgba(255,255,255,0.75)',
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 28,
    paddingVertical: 4,
  },
  roundBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refuseBtn: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: 'rgba(239,68,68,0.35)',
  },
  acceptBtn: {},
  primaryBtn: {
    borderRadius: radii.lg,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: {
    color: '#fff',
    fontFamily: fonts.bodyBold,
    fontSize: 16,
  },
  footerHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: spacing.md,
  },
  statusCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    textAlign: 'center',
  },
  statusBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  waitHero: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  waitCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  waitTitle: {
    fontFamily: fonts.displaySemi,
    fontSize: 24,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  waitCountdown: {
    fontFamily: fonts.displaySemi,
    fontSize: 42,
    letterSpacing: -1.5,
    textAlign: 'center',
    marginVertical: 2,
  },
  waitBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    marginTop: 4,
  },
  waitTips: {
    width: '100%',
    borderRadius: radii.xl,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  waitTipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: spacing.md,
  },
  waitTipLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  waitTipSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 1,
  },
  waitDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.md,
  },
});
