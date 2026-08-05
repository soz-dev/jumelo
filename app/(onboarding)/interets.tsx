import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, type ReactNode } from 'react';
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

import { ActivityArtImage } from '../../src/components/ActivityArtImage';
import { GameArtImage } from '../../src/components/GameArtImage';
import { OnboardingShell } from '../../src/components/OnboardingShell';
import {
  categories,
  getCategory,
  type UniverseId,
} from '../../src/constants/catalog';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import {
  Icon,
  elevation,
  fonts,
  motion,
  radii,
  spacing,
  withHexAlpha,
} from '../../src/design-system';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const SCREEN_W = Dimensions.get('window').width;
const GRID_GAP = 12;
const H_PAD = spacing.lg;
const GAME_COVER_W = Math.floor((SCREEN_W - H_PAD * 2 - GRID_GAP * 2) / 3);
const GAME_COVER_H = Math.round(GAME_COVER_W * 1.48);
const ACTIVITY_W = Math.floor((SCREEN_W - H_PAD * 2 - GRID_GAP) / 2);

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
        scale.value = withSpring(0.97, motion.spring);
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

export default function InteretsScreen() {
  const { draft, setDraft } = useAuth();
  const { colors } = useTheme();

  const sections = useMemo(() => {
    const ids = (
      draft.universes.length
        ? draft.universes
        : categories.map((c) => c.id)
    ) as UniverseId[];
    return ids
      .map((id) => getCategory(id))
      .filter((c): c is NonNullable<typeof c> => Boolean(c));
  }, [draft.universes]);

  const toggle = (label: string) => {
    setDraft({
      interests: draft.interests.includes(label)
        ? draft.interests.filter((i) => i !== label)
        : [...draft.interests, label],
    });
  };

  return (
    <OnboardingShell
      step={2}
      title="Tes intérêts"
      subtitle="Choisis tes jeux et activités — gros blocs, comme en boutique."
      onNext={() => router.push('/(onboarding)/vibe')}
      nextDisabled={draft.interests.length === 0}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {sections.map((cat) => {
          const isGaming = cat.id === 'gaming';
          const accent = cat.color ?? colors.primary;
          return (
            <View key={cat.id} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.inkMuted }]}>
                {cat.shortLabel.toUpperCase()}
              </Text>
              <View style={isGaming ? styles.gameGrid : styles.activityGrid}>
                {cat.subCategories.map((item, index) => {
                  const selected = draft.interests.includes(item.label);
                  return (
                    <Animated.View
                      key={item.id}
                      entering={FadeInDown.delay(Math.min(index, 8) * 35).duration(300)}
                      style={isGaming ? styles.gameTile : styles.activityOuter}
                    >
                      <ScalePressable
                        onPress={() => toggle(item.label)}
                        style={isGaming ? styles.gamePress : undefined}
                      >
                        {isGaming ? (
                          <>
                            <View
                              style={[
                                styles.gameCoverFrame,
                                elevation.lift,
                                {
                                  width: GAME_COVER_W,
                                  height: GAME_COVER_H,
                                  borderColor: selected
                                    ? accent
                                    : withHexAlpha(accent, 0.18),
                                  borderWidth: selected ? 2.5 : 1,
                                },
                              ]}
                            >
                              <GameArtImage
                                catalogId={item.id}
                                size={GAME_COVER_W}
                                height={GAME_COVER_H}
                                color={accent}
                                brandedFallback
                                borderRadius={0}
                              />
                              <LinearGradient
                                colors={['transparent', 'rgba(18,33,43,0.55)']}
                                locations={[0.55, 1]}
                                style={styles.gameCoverFade}
                                pointerEvents="none"
                              />
                              {selected ? (
                                <View
                                  style={[
                                    styles.checkBadge,
                                    { backgroundColor: accent },
                                  ]}
                                >
                                  <Icon
                                    name="check"
                                    size={14}
                                    color="#fff"
                                    weight="bold"
                                  />
                                </View>
                              ) : null}
                            </View>
                            <Text
                              style={[
                                styles.gameLabel,
                                {
                                  color: selected ? accent : colors.ink,
                                  fontFamily: selected
                                    ? fonts.bodyBold
                                    : fonts.bodyMedium,
                                },
                              ]}
                              numberOfLines={2}
                            >
                              {item.label}
                            </Text>
                          </>
                        ) : (
                          <View
                            style={[
                              styles.activityTile,
                              elevation.soft,
                              {
                                backgroundColor: colors.white,
                                borderColor: selected
                                  ? accent
                                  : withHexAlpha(accent, 0.2),
                                borderWidth: selected ? 2 : 1.5,
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.activityWash,
                                {
                                  backgroundColor: withHexAlpha(
                                    accent,
                                    selected ? 0.14 : 0.08,
                                  ),
                                },
                              ]}
                              pointerEvents="none"
                            />
                            <ActivityArtImage
                              catalogId={item.id}
                              size={48}
                              color={accent}
                              backgroundColor={withHexAlpha(accent, 0.12)}
                            />
                            <Text
                              style={[
                                styles.activityLabel,
                                {
                                  color: selected ? accent : colors.ink,
                                  fontFamily: selected
                                    ? fonts.bodyBold
                                    : fonts.bodyMedium,
                                },
                              ]}
                              numberOfLines={2}
                            >
                              {item.label}
                            </Text>
                            {selected ? (
                              <View
                                style={[
                                  styles.checkBadgeCorner,
                                  { backgroundColor: accent },
                                ]}
                              >
                                <Icon
                                  name="check"
                                  size={12}
                                  color="#fff"
                                  weight="bold"
                                />
                              </View>
                            ) : null}
                          </View>
                        )}
                      </ScalePressable>
                    </Animated.View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontFamily: fonts.bodyBold,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: spacing.sm,
    fontSize: 12,
  },
  gameGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  gameTile: {
    width: GAME_COVER_W,
  },
  gamePress: {
    width: GAME_COVER_W,
  },
  gameCoverFrame: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#12151A',
  },
  gameCoverFade: {
    ...StyleSheet.absoluteFillObject,
  },
  gameLabel: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: -0.2,
  },
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  activityOuter: {
    width: ACTIVITY_W,
  },
  activityTile: {
    width: ACTIVITY_W,
    minHeight: 112,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: 10,
    overflow: 'hidden',
  },
  activityWash: {
    ...StyleSheet.absoluteFillObject,
  },
  activityLabel: {
    fontSize: 15,
    lineHeight: 19,
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
  checkBadgeCorner: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
