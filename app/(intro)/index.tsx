import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewToken,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Atmosphere } from '../../src/components/Atmosphere';
import { BrandLogo } from '../../src/components/BrandLogo';
import { JumeloLottie, type LottieName } from '../../src/components/JumeloLottie';
import { Button, fonts, radii, spacing, typography } from '../../src/design-system';
import { useTheme } from '../../src/context/ThemeContext';
import { markIntroOnboardingDone } from '../../src/lib/introOnboarding';

type Slide = {
  key: string;
  lottie: LottieName;
  eyebrow: string;
  title: string;
  body: string;
};

const SLIDES: Slide[] = [
  {
    key: 'why',
    lottie: 'spark',
    eyebrow: 'Pas une app de dating',
    title: 'Des coéquipiers,\npas des crushs',
    body: 'Jumelo te jumèle avec des partenaires gaming, sport, études ou musique — pour jouer, progresser et s’amuser ensemble.',
  },
  {
    key: 'profil',
    lottie: 'bolt',
    eyebrow: 'Ton profil',
    title: 'Montre ce que\ntu joues vraiment',
    body: 'Univers, intérêts, vibes. Un profil clair pour des jumelages pertinents, pas des profils fantômes.',
  },
  {
    key: 'match',
    lottie: 'success',
    eyebrow: 'Jumeler',
    title: 'Like, match,\npuis passe à l’action',
    body: 'Tu vois pourquoi ça matche. Matching transparent, raisons visibles, zéro ghosting.',
  },
  {
    key: 'teams',
    lottie: 'confetti',
    eyebrow: 'Équipes & sessions',
    title: 'Du binôme\nà la session',
    body: 'Crée une équipe, planifie une session, discute dans le chat — le match devient un vrai moment de jeu.',
  },
  {
    key: 'go',
    lottie: 'spark',
    eyebrow: 'C’est parti',
    title: 'Prêt à trouver\nton Jumelo ?',
    body: 'Connecte-toi, complète ton profil, et commence à jumeler avec des coéquipiers qui te ressemblent.',
  },
];

export default function IntroOnboardingScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [listHeight, setListHeight] = useState(0);
  const scrollX = useSharedValue(0);

  const finish = useCallback(async () => {
    if (finishing) return;
    setFinishing(true);
    try {
      await markIntroOnboardingDone();
      // Directement welcome — évite le bounce sur `/` qui renvoyait vers l’intro
      // (Index restait monté avec introDone=false).
      router.replace('/(auth)/welcome');
    } catch {
      setFinishing(false);
    }
  }, [finishing]);

  const goNext = useCallback(() => {
    if (index >= SLIDES.length - 1) {
      void finish();
      return;
    }
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  }, [finish, index]);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollX.value = e.nativeEvent.contentOffset.x;
    },
    [scrollX],
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const next = viewableItems[0]?.index;
      if (typeof next === 'number') setIndex(next);
    },
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 60 }).current;
  const isLast = index === SLIDES.length - 1;

  return (
    <Atmosphere variant="intro">
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <BrandLogo size={34} />
            <Text style={[styles.brand, { color: colors.primary }]}>Jumelo</Text>
          </View>
          {!isLast ? (
            <Pressable
              onPress={() => void finish()}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Passer l’introduction"
              disabled={finishing}
            >
              <Text style={[styles.skip, { color: colors.inkMuted }]}>Passer</Text>
            </Pressable>
          ) : (
            <View style={styles.skipPlaceholder} />
          )}
        </View>

        <FlatList
          ref={listRef}
          style={styles.list}
          data={SLIDES}
          keyExtractor={(item) => item.key}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onLayout={(e) => setListHeight(e.nativeEvent.layout.height)}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          renderItem={({ item }) => (
            <SlidePage
              slide={item}
              width={width}
              height={listHeight}
              accent={colors.primary}
              ink={colors.ink}
              muted={colors.inkMuted}
              soft={colors.primarySoft}
            />
          )}
        />

        <Animated.View entering={FadeIn.delay(120).duration(280)} style={styles.footer}>
          <View style={styles.dots}>
            {SLIDES.map((slide, i) => (
              <Dot key={slide.key} index={i} width={width} scrollX={scrollX} activeColor={colors.primary} idleColor={colors.border} />
            ))}
          </View>

          <Button
            label={isLast ? 'Commencer' : 'Continuer'}
            onPress={goNext}
            loading={finishing}
            icon={isLast ? 'rocket-outline' : 'arrow-forward'}
          />
        </Animated.View>
      </SafeAreaView>
    </Atmosphere>
  );
}

function SlidePage({
  slide,
  width,
  height,
  accent,
  ink,
  muted,
  soft,
}: {
  slide: Slide;
  width: number;
  height: number;
  accent: string;
  ink: string;
  muted: string;
  soft: string;
}) {
  return (
    <View style={[styles.slide, { width, height: height || undefined }]}>
      <View style={styles.slideInner}>
        <Animated.View entering={FadeInDown.duration(360)} style={[styles.lottieWrap, { backgroundColor: soft }]}>
          <JumeloLottie name={slide.lottie} size={180} />
        </Animated.View>

        <View style={[styles.eyebrowPill, { backgroundColor: soft }]}>
          <Text style={[styles.eyebrow, { color: accent }]}>{slide.eyebrow}</Text>
        </View>

        <Text style={[styles.title, { color: ink }]}>{slide.title}</Text>
        <Text style={[styles.body, { color: muted }]}>{slide.body}</Text>
      </View>
    </View>
  );
}

function Dot({
  index,
  width,
  scrollX,
  activeColor,
  idleColor,
}: {
  index: number;
  width: number;
  scrollX: SharedValue<number>;
  activeColor: string;
  idleColor: string;
}) {
  const style = useAnimatedStyle(() => {
    const input = [(index - 1) * width, index * width, (index + 1) * width];
    const w = interpolate(scrollX.value, input, [8, 22, 8], 'clamp');
    const opacity = interpolate(scrollX.value, input, [0.45, 1, 0.45], 'clamp');
    return {
      width: w,
      opacity,
      backgroundColor: opacity > 0.75 ? activeColor : idleColor,
    };
  });

  return <Animated.View style={[styles.dot, style]} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brand: {
    ...typography.section,
    fontFamily: fonts.display,
    fontSize: 22,
    letterSpacing: -0.5,
  },
  skip: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
  },
  skipPlaceholder: { width: 56 },
  list: { flex: 1 },
  slide: {
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  slideInner: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  lottieWrap: {
    width: 220,
    height: 220,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  eyebrowPill: {
    paddingHorizontal: spacing.smd,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  eyebrow: {
    ...typography.overline,
    letterSpacing: 0.8,
  },
  title: {
    ...typography.display,
    fontSize: 30,
    lineHeight: 34,
    textAlign: 'center',
  },
  body: {
    ...typography.body,
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 340,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 12,
  },
  dot: {
    height: 8,
    borderRadius: radii.pill,
  },
});
