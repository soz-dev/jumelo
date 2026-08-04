import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Atmosphere } from '../../src/components/Atmosphere';
import { JumeloLottie } from '../../src/components/JumeloLottie';
import { getCategory, getSubCategory } from '../../src/constants/catalog';
import { fonts, spacing } from '../../src/constants/theme';
import { useTheme } from '../../src/context/ThemeContext';
import type { UniverseId } from '../../src/constants/catalog';
import { safeBack } from '../../src/lib/navigation';

const SEARCH_MS = 2500;

export default function SearchingScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{
    universe?: string;
    sub?: string;
    platform?: string;
    activity?: string;
    vibe?: string;
  }>();
  const [seconds, setSeconds] = useState(0);
  const navigated = useRef(false);

  const universe = typeof params.universe === 'string' ? params.universe : 'gaming';
  const subId = typeof params.sub === 'string' ? params.sub : '';
  const platform = typeof params.platform === 'string' ? params.platform : '';
  const activity = typeof params.activity === 'string' ? params.activity : '';
  const vibe = typeof params.vibe === 'string' ? params.vibe : '';

  const universeId = (universe || 'gaming') as UniverseId;
  const cat = getCategory(universeId);
  const sub = subId ? getSubCategory(universeId, subId) : undefined;
  const label = activity || sub?.label || cat?.shortLabel || 'gaming';

  useEffect(() => {
    navigated.current = false;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    const done = setTimeout(() => {
      if (navigated.current) return;
      navigated.current = true;
      router.replace({
        pathname: '/maintenant/results',
        params: { universe, sub: subId, platform, activity, vibe, demo: '1' },
      });
    }, SEARCH_MS);
    return () => {
      clearInterval(timer);
      clearTimeout(done);
    };
  }, [universe, subId, platform, activity, vibe]);

  const goResults = () => {
    if (navigated.current) return;
    navigated.current = true;
    router.replace({
      pathname: '/maintenant/results',
      params: { universe, sub: subId, platform, activity, vibe, demo: '1' },
    });
  };

  return (
    <Atmosphere variant="bold">
      <SafeAreaView style={styles.safe}>
        <Pressable
          style={[styles.back, { backgroundColor: colors.white, borderColor: colors.border }]}
          onPress={() => safeBack('/maintenant')}
        >
          <Ionicons name="arrow-back" size={20} color={colors.ink} />
        </Pressable>

        <View style={styles.center}>
          <JumeloLottie name="loading" size={180} />
          <Text style={[styles.status, { color: colors.ink }]}>Recherche en cours...</Text>
          <Text style={[styles.context, { color: colors.inkMuted }]}>
            On cherche des partenaires {label} dispo maintenant
          </Text>
          <Text style={[styles.timer, { color: colors.primary }]}>{seconds}s</Text>

          <Pressable
            style={[styles.skip, { borderColor: colors.primary, backgroundColor: colors.white }]}
            onPress={goResults}
          >
            <Ionicons name="play" size={16} color={colors.primary} />
            <Text style={{ color: colors.primary, fontFamily: fonts.bodyBold }}>
              Voir un jumelage démo
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  back: {
    marginLeft: spacing.lg,
    marginTop: spacing.sm,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  status: {
    fontFamily: fonts.display,
    fontSize: 26,
    letterSpacing: -0.5,
    marginTop: spacing.md,
  },
  context: {
    fontFamily: fonts.body,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: spacing.md,
    lineHeight: 22,
  },
  timer: { fontFamily: fonts.display, fontSize: 36, marginTop: spacing.lg },
  skip: {
    marginTop: spacing.xl,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
