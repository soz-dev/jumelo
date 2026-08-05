import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useEffect, type ReactNode } from 'react';
import {
  Dimensions,
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
import { SafeAreaView } from 'react-native-safe-area-context';

import { Atmosphere } from '../../src/components/Atmosphere';
import { GameArtImage } from '../../src/components/GameArtImage';
import { LifestyleCoverImage } from '../../src/components/LifestyleCoverImage';
import { ThemeSwitcherButton } from '../../src/components/ThemeSwitcher';
import { categories, getCategory, type UniverseId } from '../../src/constants/catalog';
import { getInterestPhoto } from '../../src/constants/lifestylePhotos';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import {
  elevation,
  fonts,
  Icon,
  motion,
  radii,
  resolveCatalogIcon,
  spacing,
  withHexAlpha,
} from '../../src/design-system';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const SCREEN_W = Dimensions.get('window').width;
const GRID_GAP = 12;
const H_PAD = spacing.lg;
const GAME_COVER_W = Math.floor((SCREEN_W - H_PAD * 2 - GRID_GAP * 2) / 3);
const GAME_COVER_H = Math.round(GAME_COVER_W * 1.48);
const COVER_W = GAME_COVER_W;
const COVER_H = GAME_COVER_H;

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
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.97, motion.spring); }}
      onPressOut={() => { scale.value = withSpring(1, motion.spring); }}
      style={[style, animStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}

export default function CategoriesInteretsScreen() {
  const { draft, setDraft, user } = useAuth();
  const { colors } = useTheme();

  // Seed le draft depuis le profil si on arrive directement sans passer par /categories
  useEffect(() => {
    if (draft.universes.length === 0 && user?.universes?.length) {
      setDraft({
        universes: [...user.universes],
        interests: [...user.interests],
        vibes: [...user.vibes],
      });
    }
  }, []);

  const sections = useMemo(() => {
    const ids = (
      draft.universes.length ? draft.universes : categories.map((c) => c.id)
    ) as UniverseId[];
    return ids.map((id) => getCategory(id)).filter((c): c is NonNullable<typeof c> => Boolean(c));
  }, [draft.universes]);

  const incompleteSections = useMemo(
    () =>
      sections.filter(
        (cat) => !cat.subCategories.some((item) => draft.interests.includes(item.label)),
      ),
    [sections, draft.interests],
  );

  const nextDisabled = incompleteSections.length > 0;
  const validationError = nextDisabled
    ? `Choisis au moins un élément dans : ${incompleteSections.map((c) => c.shortLabel).join(', ')}`
    : null;

  const toggle = (label: string) => {
    setDraft({
      interests: draft.interests.includes(label)
        ? draft.interests.filter((i) => i !== label)
        : [...draft.interests, label],
    });
  };

  return (
    <Atmosphere variant="soft">
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.top}>
          <Pressable
            style={[styles.backBtn, { backgroundColor: colors.white, borderColor: colors.border }]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <Ionicons name="arrow-back" size={20} color={colors.ink} />
          </Pressable>
          <ThemeSwitcherButton />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={[styles.title, { color: colors.ink }]}>Mes intérêts</Text>
          <Text style={[styles.subtitle, { color: colors.inkMuted }]}>
            Choisis tes jeux et activités — au moins un par catégorie.
          </Text>

          {sections.map((cat) => {
            const isGaming = cat.id === 'gaming';
            const accent = cat.color ?? colors.primary;
            const sectionIncomplete = incompleteSections.some((s) => s.id === cat.id);
            return (
              <View key={cat.id} style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.inkMuted }]}>
                  {cat.shortLabel.toUpperCase()}
                </Text>
                {sectionIncomplete ? (
                  <Text style={[styles.sectionError, { color: colors.accent }]}>
                    Choisis au moins un élément
                  </Text>
                ) : null}
                <View style={styles.grid}>
                  {cat.subCategories.map((item, index) => {
                    const selected = draft.interests.includes(item.label);
                    const photoUri = getInterestPhoto(item.id, cat.id);
                    return (
                      <Animated.View
                        key={item.id}
                        entering={FadeInDown.delay(Math.min(index, 8) * 35).duration(300)}
                        style={styles.tile}
                      >
                        <ScalePressable onPress={() => toggle(item.label)} style={styles.press}>
                          <View
                            style={[
                              styles.coverFrame,
                              elevation.lift,
                              {
                                width: COVER_W,
                                height: COVER_H,
                                borderColor: selected ? accent : withHexAlpha(accent, 0.18),
                                borderWidth: selected ? 2.5 : 1,
                              },
                            ]}
                          >
                            {isGaming ? (
                              <GameArtImage
                                catalogId={item.id}
                                size={GAME_COVER_W}
                                height={GAME_COVER_H}
                                color={accent}
                                brandedFallback
                                borderRadius={0}
                              />
                            ) : (
                              <LifestyleCoverImage
                                uri={photoUri}
                                width={COVER_W}
                                height={COVER_H}
                                color={accent}
                                iconName={resolveCatalogIcon(item.id)}
                                borderRadius={0}
                              />
                            )}
                            <LinearGradient
                              colors={['transparent', 'rgba(18,33,43,0.55)']}
                              locations={[0.55, 1]}
                              style={styles.coverFade}
                              pointerEvents="none"
                            />
                            {selected ? (
                              <View style={[styles.checkBadge, { backgroundColor: accent }]}>
                                <Icon name="check" size={14} color="#fff" weight="bold" />
                              </View>
                            ) : null}
                          </View>
                          <Text
                            style={[
                              styles.label,
                              {
                                color: selected ? accent : colors.ink,
                                fontFamily: selected ? fonts.bodyBold : fonts.bodyMedium,
                              },
                            ]}
                            numberOfLines={2}
                          >
                            {item.label}
                          </Text>
                        </ScalePressable>
                      </Animated.View>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </ScrollView>

        {validationError ? (
          <Text style={[styles.footerError, { color: colors.accent }]}>{validationError}</Text>
        ) : null}

        <Pressable
          style={[styles.cta, { backgroundColor: colors.primary, opacity: nextDisabled ? 0.55 : 1 }]}
          onPress={() => router.push('/categories/vibe')}
          disabled={nextDisabled}
          accessibilityRole="button"
          accessibilityLabel="Continuer vers la vibe"
        >
          <Text style={{ color: '#fff', fontFamily: fonts.bodyBold, textAlign: 'center', fontSize: 16 }}>
            Continuer
          </Text>
        </Pressable>
      </SafeAreaView>
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  title: {
    fontFamily: fonts.displaySemi,
    fontSize: 28,
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  section: { marginBottom: spacing.xl },
  sectionTitle: {
    fontFamily: fonts.bodyBold,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: spacing.sm,
    fontSize: 12,
  },
  sectionError: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  footerError: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    textAlign: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  tile: { width: COVER_W },
  press: { width: COVER_W },
  coverFrame: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#12151A',
  },
  coverFade: { ...StyleSheet.absoluteFillObject },
  label: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: -0.2,
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cta: {
    margin: spacing.lg,
    marginTop: spacing.sm,
    borderRadius: radii.pill,
    paddingVertical: 16,
  },
});
