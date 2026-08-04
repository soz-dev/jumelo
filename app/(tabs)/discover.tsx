import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  ImageBackground,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Atmosphere } from '../../src/components/Atmosphere';
import { JumeloLottie } from '../../src/components/JumeloLottie';
import { ThemeSwitcherButton } from '../../src/components/ThemeSwitcher';
import { getCategory } from '../../src/constants/catalog';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { mockUsers, type UserProfile } from '../../src/data/mock';
import {
  CategoryPill,
  HeaderRow,
  elevation,
  fonts,
  radii,
  spacing,
} from '../../src/design-system';
import { createLike } from '../../src/lib/api/likes';
import { listProfiles } from '../../src/lib/api/profiles';
import { getCommonPoints } from '../../src/lib/commonPoints';
import { shouldCelebrateMatch } from '../../src/lib/demoMatch';
import { recordDemoMatch } from '../../src/lib/likesStore';
import { isOfficialJumelage, MatchResult, rankMatches } from '../../src/lib/matching';

const { width } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.28;

export default function DiscoverScreen() {
  const { user, usingSupabase } = useAuth();
  const { colors } = useTheme();
  const [pool, setPool] = useState<UserProfile[]>(mockUsers);

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

  const allMatches = useMemo(
    () => (user ? rankMatches(user, pool) : []),
    [user, pool],
  );
  const [index, setIndex] = useState(0);
  const [liked, setLiked] = useState<string[]>([]);
  const [passed, setPassed] = useState<string[]>([]);
  const [likeToast, setLikeToast] = useState<string | null>(null);
  const position = useRef(new Animated.ValueXY()).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIndex(0);
  }, [pool]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const current: MatchResult | undefined = allMatches[index];
  const remaining = Math.max(0, allMatches.length - index);
  const currentRef = useRef(current);
  currentRef.current = current;

  const showToast = (message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setLikeToast(message);
    toastTimer.current = setTimeout(() => setLikeToast(null), 2200);
  };

  const advance = (direction: 'left' | 'right') => {
    const match = currentRef.current;
    if (!match || !user) return;
    const previousLikeCount = liked.length;
    const peerId = match.user.id;
    const score = match.score;

    if (direction === 'right') {
      setLiked((prev) => [...prev, peerId]);
    } else {
      setPassed((prev) => [...prev, peerId]);
    }

    Animated.timing(position, {
      toValue: { x: direction === 'right' ? width * 1.2 : -width * 1.2, y: 0 },
      duration: 220,
      useNativeDriver: false,
    }).start(async () => {
      position.setValue({ x: 0, y: 0 });
      setIndex((i) => i + 1);

      if (direction !== 'right') return;

      const likeResult = await createLike(user.id, peerId, score);
      const celebrate = await shouldCelebrateMatch({
        myId: user.id,
        likedUserId: peerId,
        previousLikeCount,
        score,
        mutualFromLike: likeResult.mutual,
      });

      if (celebrate) {
        if (!likeResult.mutual && !likeResult.alreadyMatched) {
          await recordDemoMatch(user.id, peerId, score);
        }
        router.push(`/match-success/${peerId}`);
        return;
      }

      showToast(
        likeResult.mutual
          ? 'C’est un match!'
          : isOfficialJumelage(score)
            ? 'Like envoyé'
            : `Pas encore un jumelage (score ${score}%)`,
      );
    });
  };

  const advanceRef = useRef(advance);
  advanceRef.current = advance;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8,
      onPanResponderMove: Animated.event([null, { dx: position.x, dy: position.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, g) => {
        if (g.dx > SWIPE_THRESHOLD) {
          advanceRef.current('right');
        } else if (g.dx < -SWIPE_THRESHOLD) {
          advanceRef.current('left');
        } else {
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
        }
      },
    }),
  ).current;

  const rotate = position.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp',
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const nopeOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  if (!user) return null;

  return (
    <Atmosphere>
      <SafeAreaView style={[styles.safe, { backgroundColor: 'transparent' }]} edges={['top']}>
      <View style={styles.header}>
        <HeaderRow
          title="Discover ⚡"
          subtitle={`${remaining} profils · vibe joueur`}
          right={
            <View style={styles.headerActions}>
              <JumeloLottie name="spark" size={36} />
              <ThemeSwitcherButton />
              <Pressable
                style={[styles.filterBtn, { backgroundColor: colors.white, borderColor: colors.border }]}
                onPress={() => router.push('/categories')}
              >
                <Ionicons name="options-outline" size={20} color={colors.ink} />
              </Pressable>
            </View>
          }
        />
      </View>

      <View style={styles.deck}>
        {!current ? (
          <View style={[styles.empty, { backgroundColor: colors.white }]}>
            <Text style={[styles.emptyTitle, { color: colors.ink }]}>Plus de profils</Text>
            <Text style={{ color: colors.inkMuted, fontFamily: fonts.body, textAlign: 'center' }}>
              Likés : {liked.length} · Passés : {passed.length}
            </Text>
            <Pressable
              style={[styles.resetBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                setIndex(0);
                setLiked([]);
                setPassed([]);
              }}
            >
              <Text style={{ color: '#fff', fontFamily: fonts.bodyBold }}>Recommencer</Text>
            </Pressable>
          </View>
        ) : (
          <Animated.View
            style={[
              styles.card,
              elevation.soft,
              {
                backgroundColor: colors.white,
                transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }],
              },
            ]}
            {...panResponder.panHandlers}
          >
            <Pressable
              style={styles.photo}
              onPress={() => router.push(`/user/${current.user.id}`)}
            >
            <ImageBackground
              source={{
                uri:
                  current.user.photo ??
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(current.user.name)}&size=800`,
              }}
              style={styles.photo}
            >
              <Animated.View style={[styles.stamp, styles.likeStamp, { opacity: likeOpacity }]}>
                <Text style={styles.stampText}>LIKE</Text>
              </Animated.View>
              <Animated.View style={[styles.stamp, styles.nopeStamp, { opacity: nopeOpacity }]}>
                <Text style={styles.stampText}>NOPE</Text>
              </Animated.View>

              <View style={styles.topBadges}>
                {(() => {
                  const cat = getCategory(current.user.universes[0]);
                  return cat ? (
                    <CategoryPill universeId={cat.id} label={cat.shortLabel} color={cat.color} />
                  ) : null;
                })()}
                <View style={styles.scoreCircle}>
                  <Text style={styles.scoreNum}>{current.score}</Text>
                </View>
              </View>

              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.overlay}>
                <Text style={styles.name}>
                  {current.user.name}
                  {current.user.age ? ` ${current.user.age}` : ''}
                </Text>
                <View style={styles.cityRow}>
                  <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.city}>{current.user.city}</Text>
                </View>
                <Text style={styles.bio} numberOfLines={2}>
                  {current.user.bio}
                </Text>
                {(() => {
                  const commons = user
                    ? getCommonPoints(user, current.user).slice(0, 4)
                    : [];
                  if (commons.length > 0) {
                    return (
                      <View style={styles.tags}>
                        <View
                          style={[
                            styles.tag,
                            { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', gap: 4 },
                          ]}
                        >
                          <Ionicons name="git-compare-outline" size={12} color="#fff" />
                          <Text style={styles.tagText}>En commun</Text>
                        </View>
                        {commons.map((point) => (
                          <View key={point.key} style={styles.tag}>
                            <Text style={styles.tagText}>{point.label}</Text>
                          </View>
                        ))}
                      </View>
                    );
                  }
                  return (
                    <View style={styles.tags}>
                      {current.user.interests.slice(0, 3).map((interest) => (
                        <View key={interest} style={styles.tag}>
                          <Text style={styles.tagText}>{interest}</Text>
                        </View>
                      ))}
                      <View
                        style={[
                          styles.tag,
                          { backgroundColor: '#F59E0B', flexDirection: 'row', alignItems: 'center', gap: 4 },
                        ]}
                      >
                        <Ionicons name="happy-outline" size={12} color="#fff" />
                        <Text style={styles.tagText}>{current.user.vibes.join(' · ')}</Text>
                      </View>
                    </View>
                  );
                })()}
              </LinearGradient>
            </ImageBackground>
            </Pressable>

            <View style={styles.actions}>
              <Pressable
                style={[styles.roundBtn, { borderColor: colors.border }]}
                onPress={() => advance('left')}
              >
                <Ionicons name="close" size={28} color={colors.inkMuted} />
              </Pressable>
              <Pressable
                style={[styles.whyBtn, { backgroundColor: colors.accent }]}
                onPress={() => router.push(`/user/${current.user.id}`)}
              >
                <Ionicons name="eye" size={18} color="#fff" />
                <Text style={styles.whyText}>Voir le profil</Text>
              </Pressable>
              <Pressable
                style={[styles.roundBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={() => advance('right')}
              >
                <Ionicons name="heart" size={24} color="#fff" />
              </Pressable>
            </View>
          </Animated.View>
        )}
      </View>

      <Text style={[styles.hint, { color: colors.inkFaint }]}>
        Swipe droite = like · swipe gauche = passer · jumelage dès 80%
      </Text>

      {likeToast ? (
        <View style={[styles.toast, { backgroundColor: colors.ink }]}>
          <Ionicons name="heart-outline" size={16} color="#fff" />
          <Text style={styles.toastText}>{likeToast}</Text>
        </View>
      ) : null}
    </SafeAreaView>
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  headerActions: { flexDirection: 'row', gap: 8 },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deck: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    justifyContent: 'center',
  },
  card: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    height: '88%',
  },
  photo: { flex: 1 },
  topBadges: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  scoreCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNum: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 16 },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.md,
    paddingBottom: 90,
  },
  name: { color: '#fff', fontFamily: fonts.displaySemi, fontSize: 28 },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  city: { color: 'rgba(255,255,255,0.9)', fontFamily: fonts.body },
  bio: { color: 'rgba(255,255,255,0.9)', fontFamily: fonts.body, marginTop: 8, lineHeight: 20 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tag: {
    backgroundColor: 'rgba(40,40,40,0.75)',
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagText: { color: '#fff', fontFamily: fonts.bodyMedium, fontSize: 12 },
  actions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: '#fff',
  },
  roundBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radii.pill,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  whyText: { color: '#fff', fontFamily: fonts.bodyBold },
  stamp: {
    position: 'absolute',
    top: 40,
    zIndex: 5,
    borderWidth: 3,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  likeStamp: { left: 20, borderColor: '#22C55E', transform: [{ rotate: '-15deg' }] },
  nopeStamp: { right: 20, borderColor: '#EF4444', transform: [{ rotate: '15deg' }] },
  stampText: { fontFamily: fonts.display, fontSize: 28, color: '#fff' },
  empty: {
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyTitle: { fontFamily: fonts.displaySemi, fontSize: 22 },
  resetBtn: {
    marginTop: spacing.md,
    borderRadius: radii.pill,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  hint: {
    textAlign: 'center',
    fontFamily: fonts.body,
    fontSize: 12,
    marginBottom: spacing.sm,
  },
  toast: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: 56,
    borderRadius: radii.pill,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 20,
  },
  toastText: { color: '#fff', fontFamily: fonts.bodyMedium, fontSize: 13, flex: 1 },
});
