import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Atmosphere } from '../../src/components/Atmosphere';
import { ThemeSwitcherButton } from '../../src/components/ThemeSwitcher';
import { getCategory } from '../../src/constants/catalog';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { mockUsers, type UserProfile } from '../../src/data/mock';
import {
  CategoryPill,
  elevation,
  fonts,
  radii,
  spacing,
  withHexAlpha,
} from '../../src/design-system';
import { listProfiles } from '../../src/lib/api/profiles';
import { getCommonPoints } from '../../src/lib/commonPoints';
import {
  acceptDailyJumelo,
  dismissDailyOutcome,
  formatRemaining,
  getDailyJumeloView,
  refuseDailyJumelo,
  type DailyViewModel,
} from '../../src/lib/dailyJumelo';
import { openChatWithUser } from '../../src/lib/users';

const { height: SCREEN_H } = Dimensions.get('window');

export default function DiscoverScreen() {
  const { user, usingSupabase } = useAuth();
  const { colors } = useTheme();
  const [pool, setPool] = useState<UserProfile[]>(mockUsers);
  const [view, setView] = useState<DailyViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  /** Peer figé juste après refus (pour le stamp avant reload). */
  const [refusedFlash, setRefusedFlash] = useState<UserProfile | null>(null);

  const loadPool = useCallback(async () => {
    if (!usingSupabase || !user || user.id.startsWith('u-') || user.id.startsWith('fb-')) {
      setPool(mockUsers);
      return mockUsers;
    }
    const remote = await listProfiles(user.id);
    const next = remote.length ? remote : mockUsers;
    setPool(next);
    return next;
  }, [usingSupabase, user]);

  const refresh = useCallback(async () => {
    if (!user) {
      setView(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const p = await loadPool();
      const v = await getDailyJumeloView(user, p);
      setView(v);
      if (v.mode === 'card' || v.mode === 'empty') {
        setRefusedFlash(null);
      }
    } finally {
      setLoading(false);
    }
  }, [user, loadPool]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        await refresh();
        if (!active) return;
      })();
      return () => {
        active = false;
      };
    }, [refresh]),
  );

  useEffect(() => {
    if (!view) return;
    if (view.mode !== 'cooldown' && view.mode !== 'trial') return;
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, [view?.mode]);

  void tick;

  const onRefuse = async () => {
    if (!user || busy || !view?.peer) return;
    setBusy(true);
    const peerSnapshot = view.peer;
    setRefusedFlash(peerSnapshot);
    try {
      await refuseDailyJumelo(user.id);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const onAccept = async () => {
    if (!user || busy) return;
    setBusy(true);
    setRefusedFlash(null);
    try {
      const p = pool.length ? pool : await loadPool();
      const result = await acceptDailyJumelo(user, p);
      if (result.mutual && result.conversationId) {
        router.push(`/chat/${result.conversationId}`);
        return;
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const onOpenChat = async () => {
    if (!user || !view?.peer || busy) return;
    setBusy(true);
    try {
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
      setRefusedFlash(null);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const peer = refusedFlash ?? view?.peer ?? null;
  const common = user && peer && view?.mode === 'card' ? getCommonPoints(user, peer).slice(0, 4) : [];
  const cooldownLabel = formatRemaining(
    view?.cooldownUntil
      ? Math.max(0, new Date(view.cooldownUntil).getTime() - Date.now())
      : view?.msUntilCooldownEnd ?? 0,
  );
  const trialLabel = formatRemaining(
    view?.trial
      ? Math.max(0, new Date(view.trial.endsAt).getTime() - Date.now())
      : view?.msUntilTrialEnd ?? 0,
  );

  const showRefused =
    view?.mode === 'cooldown' || Boolean(refusedFlash && view?.mode !== 'card');

  return (
    <Atmosphere variant="bold">
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.topBar}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.ink }]}>Aujourd’hui</Text>
            <Text style={[styles.subtitle, { color: colors.inkMuted }]}>
              {view?.mode === 'cooldown'
                ? `Prochaine proposition dans ${cooldownLabel}`
                : view?.mode === 'trial'
                  ? `${trialLabel} pour former l’équipe`
                  : view?.mode === 'waiting_peer'
                    ? 'En attente de sa réponse'
                    : 'Une proposition · 24 h · accepte ou refuse'}
            </Text>
          </View>
          <ThemeSwitcherButton />
        </View>

        {loading || !view ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : view.mode === 'empty' ? (
          <View style={styles.centerPad}>
            <StatusBlock
              colors={colors}
              icon="compass-outline"
              title="Personne pour l’instant"
              body="Élargis tes intérêts — on te propose quelqu’un dès qu’il y a un bon match."
            />
          </View>
        ) : view.mode === 'formed' && peer ? (
          <View style={styles.centerPad}>
            <StatusBlock
              colors={colors}
              icon="checkmark-circle"
              title="C’est validé"
              body={`Toi et ${peer.name.split(' ')[0]} avez confirmé ensemble.`}
            />
            <Pressable
              onPress={onDismissOutcome}
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.primaryLabel}>Continuer</Text>
            </Pressable>
          </View>
        ) : view.mode === 'rejected' ? (
          <View style={styles.centerPad}>
            <StatusBlock
              colors={colors}
              icon="close-circle-outline"
              title="Tentative terminée"
              body="Les 72 h sont passées sans double validation."
            />
            <Pressable
              onPress={onDismissOutcome}
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.primaryLabel}>Ok, plus tard</Text>
            </Pressable>
          </View>
        ) : peer ? (
          <View style={styles.stage}>
            <PeerCard
              peer={peer}
              score={view.score}
              colors={colors}
              common={common}
              refused={showRefused || view.mode === 'cooldown'}
              onOpenProfile={
                view.mode === 'card'
                  ? () => router.push(`/user/${peer.id}`)
                  : undefined
              }
            />

            {view.mode === 'card' && !showRefused ? (
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
                  style={[styles.roundBtn, styles.acceptBtn, { backgroundColor: colors.primary }]}
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

            {view.mode === 'waiting_peer' ? (
              <Text style={[styles.footerHint, { color: colors.inkMuted }]}>
                {peer.name.split(' ')[0]} doit aussi accepter pour ouvrir le chat.
              </Text>
            ) : null}

            {view.mode === 'trial' ? (
              <Pressable
                onPress={onOpenChat}
                disabled={busy}
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.primaryLabel}>Ouvrir le chat · {trialLabel}</Text>
              </Pressable>
            ) : null}

            {view.mode === 'cooldown' ? (
              <Text style={[styles.footerHint, { color: colors.inkMuted }]}>
                Non retenu — prochaine proposition dans {cooldownLabel}.
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.centerPad}>
            <StatusBlock
              colors={colors}
              icon="time-outline"
              title="Prochaine proposition"
              body={`Reviens dans ${cooldownLabel}.`}
            />
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
  refused,
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
  refused?: boolean;
  onOpenProfile?: () => void;
}) {
  return (
    <Pressable
      onPress={onOpenProfile}
      disabled={!onOpenProfile}
      style={[styles.card, elevation.lift, refused ? styles.cardRefused : null]}
    >
      <ImageBackground
        source={{
          uri:
            peer.photo ??
            `https://ui-avatars.com/api/?name=${encodeURIComponent(peer.name)}&background=2F6BFF&color=fff&size=800`,
        }}
        style={styles.photo}
        imageStyle={refused ? { opacity: 0.45 } : undefined}
      >
        {refused ? <View style={styles.greyWash} pointerEvents="none" /> : null}

        {refused ? (
          <View style={styles.nopeStamp}>
            <Text style={styles.nopeStampText}>NON RETENU</Text>
          </View>
        ) : null}

        {!refused ? (
          <View style={[styles.scorePill, { backgroundColor: colors.primary }]}>
            <Text style={styles.scoreText}>{Math.round(score)}%</Text>
          </View>
        ) : null}

        <LinearGradient
          colors={['transparent', 'rgba(10,20,40,0.92)']}
          locations={[0.35, 1]}
          style={styles.photoGrad}
        >
          <Text style={[styles.photoName, refused ? styles.photoNameMuted : null]}>
            {peer.name}
            {peer.age ? `, ${peer.age}` : ''}
          </Text>
          <Text style={styles.photoMeta}>
            {[peer.city, peer.level].filter(Boolean).join(' · ')}
          </Text>

          {peer.bio && !refused ? (
            <Text style={styles.bioOnPhoto} numberOfLines={2}>
              {peer.bio}
            </Text>
          ) : null}

          {!refused && peer.universes?.length ? (
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

          {!refused && common.length ? (
            <Text style={styles.commonLine} numberOfLines={1}>
              En commun · {common.map((c) => c.label).join(' · ')}
            </Text>
          ) : null}
        </LinearGradient>
      </ImageBackground>
    </Pressable>
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
    fontFamily: fonts.display,
    fontSize: 28,
    letterSpacing: -0.6,
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
  cardRefused: {
    opacity: 0.95,
  },
  photo: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: '#1B2A4A',
  },
  greyWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(40,45,55,0.55)',
  },
  nopeStamp: {
    position: 'absolute',
    top: '38%',
    alignSelf: 'center',
    left: 28,
    right: 28,
    zIndex: 5,
    borderWidth: 4,
    borderColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    transform: [{ rotate: '-12deg' }],
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
  },
  nopeStampText: {
    fontFamily: fonts.display,
    fontSize: 28,
    letterSpacing: 1.2,
    color: '#EF4444',
  },
  photoGrad: {
    padding: spacing.lg,
    paddingTop: 100,
    gap: 6,
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
});
