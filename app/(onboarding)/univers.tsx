import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { type ReactNode } from 'react';
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
  type Category,
  type UniverseId,
  categories,
} from '../../src/constants/catalog';
import { mixHex } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import {
  Icon,
  elevation,
  fonts,
  motion,
  spacing,
  universeIcon,
  withHexAlpha,
} from '../../src/design-system';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const SCREEN_W = Dimensions.get('window').width;
const GRID_GAP = 12;
const H_PAD = spacing.lg;
const COL_W = Math.floor((SCREEN_W - H_PAD * 2 - GRID_GAP) / 2);
const COVER_H = Math.round(COL_W * 1.42);
const HERO_H = Math.round((SCREEN_W - H_PAD * 2) * 0.52);

const UNIVERSE_DARK: Record<UniverseId, string> = {
  gaming: '#3D2A9E',
  sports: '#0A5F5C',
  education: '#1D4ED8',
  music: '#B45309',
  hobbies: '#BE185D',
};

/** Visuel “cover” par univers (premier item du catalogue). */
const UNIVERSE_COVER_ID: Record<UniverseId, string> = {
  gaming: 'valorant',
  sports: 'football',
  education: 'code',
  music: 'guitare',
  hobbies: 'cinema',
};

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

function UniversePoster({
  cat,
  selected,
  hero,
  onPress,
}: {
  cat: Category;
  selected: boolean;
  hero?: boolean;
  onPress: () => void;
}) {
  const dark = UNIVERSE_DARK[cat.id];
  const soft = mixHex(cat.color, '#FFFFFF', 0.22);
  const width = hero ? SCREEN_W - H_PAD * 2 : COL_W;
  const height = hero ? HERO_H : COVER_H;
  const coverId = UNIVERSE_COVER_ID[cat.id];
  const isGaming = cat.id === 'gaming';

  return (
    <ScalePressable onPress={onPress} style={{ width }}>
      <View
        style={[
          styles.frame,
          elevation.lift,
          {
            width,
            height,
            borderColor: selected ? cat.color : withHexAlpha(cat.color, 0.2),
            borderWidth: selected ? 2.5 : 1,
            shadowColor: dark,
          },
        ]}
      >
        {isGaming ? (
          <GameArtImage
            catalogId={coverId}
            size={width}
            height={height}
            color={cat.color}
            brandedFallback
            borderRadius={0}
          />
        ) : (
          <>
            <LinearGradient
              colors={[soft, cat.color, dark]}
              locations={[0, 0.45, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.artFloat} pointerEvents="none">
              <ActivityArtImage
                catalogId={coverId}
                size={hero ? 72 : 56}
                color="#fff"
                backgroundColor={withHexAlpha('#fff', 0.12)}
              />
            </View>
            <View style={styles.watermark} pointerEvents="none">
              <Icon
                name={universeIcon(cat.id)}
                size={hero ? 120 : 88}
                color="rgba(255,255,255,0.12)"
                weight="fill"
              />
            </View>
          </>
        )}

        <LinearGradient
          colors={['transparent', 'rgba(10,16,28,0.75)']}
          locations={[0.35, 1]}
          style={styles.fade}
          pointerEvents="none"
        />

        <View style={[styles.copy, hero ? styles.copyHero : null]}>
          <View
            style={[
              styles.iconGlass,
              { backgroundColor: withHexAlpha('#fff', 0.18) },
            ]}
          >
            <Icon
              name={universeIcon(cat.id)}
              size={hero ? 22 : 18}
              color="#fff"
              weight="bold"
            />
          </View>
          <Text style={[styles.title, hero ? styles.titleHero : null]} numberOfLines={2}>
            {cat.label}
          </Text>
          <Text style={styles.meta} numberOfLines={hero ? 2 : 2}>
            {cat.description}
          </Text>
        </View>

        {selected ? (
          <View style={[styles.check, { backgroundColor: cat.color }]}>
            <Icon name="check" size={14} color="#fff" weight="bold" />
          </View>
        ) : null}
      </View>
    </ScalePressable>
  );
}

export default function UniversScreen() {
  const { draft, setDraft } = useAuth();
  const { colors } = useTheme();

  const toggle = (id: UniverseId) => {
    const exists = draft.universes.includes(id);
    setDraft({
      universes: exists
        ? draft.universes.filter((u) => u !== id)
        : [...draft.universes, id],
    });
  };

  return (
    <OnboardingShell
      step={1}
      title="Tes univers"
      subtitle="Gros blocs — choisis un ou plusieurs terrains de jeu."
      onNext={() => router.push('/(onboarding)/interets')}
      nextDisabled={draft.universes.length === 0}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {categories.map((cat, index) => {
            const hero = index === 0;
            const selected = draft.universes.includes(cat.id);
            return (
              <Animated.View
                key={cat.id}
                entering={FadeInDown.delay(Math.min(index, 6) * 45).duration(320)}
                style={hero ? styles.heroOuter : styles.colOuter}
              >
                <UniversePoster
                  cat={cat}
                  hero={hero}
                  selected={selected}
                  onPress={() => toggle(cat.id)}
                />
              </Animated.View>
            );
          })}
        </View>
        <Text style={[styles.hint, { color: colors.inkMuted }]}>
          Tu pourras préciser jeux et activités à l’étape suivante.
        </Text>
      </ScrollView>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  heroOuter: {
    width: '100%',
  },
  colOuter: {
    width: COL_W,
  },
  frame: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#12151A',
  },
  fade: {
    ...StyleSheet.absoluteFillObject,
  },
  artFloat: {
    position: 'absolute',
    top: 16,
    right: 14,
  },
  watermark: {
    position: 'absolute',
    right: -10,
    bottom: 24,
    opacity: 1,
  },
  copy: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    gap: 4,
  },
  copyHero: {
    left: 16,
    right: 16,
    bottom: 16,
    gap: 6,
  },
  iconGlass: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    color: '#fff',
    fontFamily: fonts.displaySemi,
    fontSize: 17,
    letterSpacing: -0.3,
  },
  titleHero: {
    fontSize: 24,
    fontFamily: fonts.display,
  },
  meta: {
    color: 'rgba(255,255,255,0.82)',
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 16,
  },
  check: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
