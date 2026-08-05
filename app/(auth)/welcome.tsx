import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { type Href, router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, Line, Pattern, Rect } from 'react-native-svg';

import { BrandLogo } from '../../src/components/BrandLogo';
import { JumeloLottie } from '../../src/components/JumeloLottie';
import { ThemeSwitcherButton } from '../../src/components/ThemeSwitcher';
import {
  Subtitle,
  fonts,
  radii,
  spacing,
  themeHeroColors,
  themeWashColors,
  themeGradientAngles,
  typography,
} from '../../src/design-system';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { LEGAL_VERSION, acceptLegal } from '../../src/legal';
import {
  APPLE_FIREBASE_EXPO_GO_MESSAGE,
  isExpoGoRuntime,
} from '../../src/lib/firebaseAuth';

const isWeb = Platform.OS === 'web';
/** iPhone → Apple ; Android → Google ; web → Google. */
const showAppleCta = Platform.OS === 'ios';
const showGoogleCta = Platform.OS === 'android' || isWeb;

export default function WelcomeScreen() {
  const { colors } = useTheme();
  const { loginWithProvider } = useAuth();
  const [legalChecked, setLegalChecked] = useState(false);
  const [error, setError] = useState('');
  const [oauthLoading, setOauthLoading] = useState(false);

  const requireLegal = () => {
    if (!legalChecked) {
      setError('Accepte les règles Jumelo pour continuer.');
      return false;
    }
    return true;
  };

  const onOAuth = async (provider: 'apple' | 'google') => {
    if (!requireLegal()) return;
    if (provider === 'apple' && isExpoGoRuntime()) {
      Alert.alert('Apple indisponible dans Expo Go', APPLE_FIREBASE_EXPO_GO_MESSAGE, [
        { text: 'OK' },
      ]);
      return;
    }
    // Pas de confirm avant Google (casse le geste → popup bloquée).
    setOauthLoading(true);
    setError('');
    const result = await loginWithProvider(provider);
    setOauthLoading(false);
    if (!result.ok) {
      if (!result.cancelled) setError(result.error);
      return;
    }
    await acceptLegal(LEGAL_VERSION);
    router.replace('/');
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.primary }]}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark, '#0B3A42']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <Pattern id="welcome-scratches" patternUnits="userSpaceOnUse" width="56" height="56">
            <Line x1="0" y1="10" x2="22" y2="0" stroke="#fff" strokeWidth="1" opacity="0.08" />
            <Line x1="28" y1="48" x2="56" y2="30" stroke="#fff" strokeWidth="1" opacity="0.06" />
            <Line
              x1="12"
              y1="56"
              x2="40"
              y2="28"
              stroke={colors.accent}
              strokeWidth="1"
              opacity="0.1"
            />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#welcome-scratches)" />
      </Svg>
      <View style={styles.bgLottie} pointerEvents="none">
        <JumeloLottie name="bolt" size={300} style={{ opacity: 0.26 }} />
      </View>
      <View style={styles.bgSparkA} pointerEvents="none">
        <JumeloLottie name="spark" size={180} style={{ opacity: 0.2 }} />
      </View>
      <View style={styles.bgSparkB} pointerEvents="none">
        <JumeloLottie name="spark" size={120} style={{ opacity: 0.16 }} />
      </View>
      <SafeAreaView style={styles.safe}>
        <View style={{ alignItems: 'flex-end' }}>
          <ThemeSwitcherButton />
        </View>
        <Animated.View entering={FadeInDown.duration(420)} style={styles.hero}>
          <BrandLogo size={72} />
          <Text style={styles.brand}>Jumelo</Text>
          <Text style={styles.headline}>Trouve ton{'\n'}jumelo.</Text>
          <Subtitle style={styles.lead}>
            Gaming, sport, études, musique. Matching clair,
            raisons visibles, zéro ghosting.
          </Subtitle>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(120).duration(400)}
          style={[styles.panel, { backgroundColor: colors.cream }]}
        >
          <Text style={[styles.panelTitle, { color: colors.ink }]}>Commencer</Text>
          <Text style={[styles.panelHint, { color: colors.inkMuted }]}>
            {showAppleCta
              ? 'Connexion rapide avec Apple sur iPhone.'
              : 'Connexion rapide avec Google.'}
          </Text>

          <Pressable
            onPress={() => setLegalChecked((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: legalChecked }}
            style={styles.legalRow}
            hitSlop={8}
          >
            <View
              style={[
                styles.legalBox,
                {
                  borderColor: legalChecked ? colors.primary : colors.border,
                  backgroundColor: legalChecked ? colors.primary : 'transparent',
                },
              ]}
            >
              {legalChecked ? (
                <Ionicons name="checkmark" size={14} color="#fff" />
              ) : null}
            </View>
            <Text style={[styles.legalText, { color: colors.inkMuted }]}>
              J’accepte les{' '}
              <Text
                style={{ color: colors.primary, fontFamily: fonts.bodyBold }}
                onPress={() => router.push('/settings/rules' as Href)}
              >
                règles Jumelo
              </Text>
              {' '}(dont{' '}
              <Text
                style={{ color: colors.primary, fontFamily: fonts.bodyBold }}
                onPress={() => router.push('/settings/cgu' as Href)}
              >
                CGU
              </Text>
              {' '}et{' '}
              <Text
                style={{ color: colors.primary, fontFamily: fonts.bodyBold }}
                onPress={() => router.push('/settings/privacy' as Href)}
              >
                confidentialité
              </Text>
              ).
            </Text>
          </Pressable>

          {error ? <Text style={[styles.error, { color: colors.accent }]}>{error}</Text> : null}

          {showAppleCta ? (
            <Pressable
              style={[styles.socialBtn, styles.appleBtn, { opacity: legalChecked ? 1 : 0.55 }]}
              onPress={() => onOAuth('apple')}
              disabled={oauthLoading}
              accessibilityRole="button"
              accessibilityLabel="Continuer avec Apple"
            >
              <Ionicons name="logo-apple" size={22} color="#fff" />
              <Text style={styles.appleLabel}>
                {oauthLoading ? 'Connexion…' : 'Continuer avec Apple'}
              </Text>
            </Pressable>
          ) : null}

          {showGoogleCta ? (
            <Pressable
              style={[
                styles.socialBtn,
                styles.googleBtn,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.white,
                  opacity: legalChecked ? 1 : 0.55,
                },
              ]}
              onPress={() => onOAuth('google')}
              disabled={oauthLoading}
              accessibilityRole="button"
              accessibilityLabel="Continuer avec Google"
            >
              <Text style={[styles.googleG, { color: colors.ink }]}>G</Text>
              <Text style={[styles.googleLabel, { color: colors.ink }]}>
                {oauthLoading ? 'Connexion…' : 'Continuer avec Google'}
              </Text>
            </Pressable>
          ) : null}

          <View style={styles.dividerRow}>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerLabel, { color: colors.inkFaint }]}>ou par email</Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
          </View>

          <Pressable
            onPress={() => router.push('/(auth)/register')}
            style={styles.secondaryLink}
            accessibilityRole="button"
          >
            <Text style={[styles.secondaryPrimary, { color: colors.primary }]}>
              Créer un compte
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(auth)/login')}
            style={styles.secondaryLink}
            accessibilityRole="button"
          >
            <Text style={[styles.secondaryMuted, { color: colors.inkMuted }]}>
              Déjà un compte ?{' '}
              <Text style={{ color: colors.ink, fontFamily: fonts.bodyBold }}>Se connecter</Text>
            </Text>
          </Pressable>

          {typeof __DEV__ !== 'undefined' && __DEV__ ? (
            <Text style={[styles.demoHint, { color: colors.inkFaint }]}>
              Démo (__DEV__) : lea@jumelo.app
            </Text>
          ) : null}
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bgLottie: {
    position: 'absolute',
    right: -50,
    top: 60,
  },
  bgSparkA: {
    position: 'absolute',
    left: -50,
    bottom: 220,
  },
  bgSparkB: {
    position: 'absolute',
    right: 40,
    top: '48%',
  },
  safe: { flex: 1, justifyContent: 'space-between', padding: spacing.lg },
  hero: { marginTop: spacing.md, gap: spacing.sm },
  brand: {
    ...typography.hero,
    fontSize: 52,
    lineHeight: 54,
    color: '#fff',
  },
  headline: {
    ...typography.display,
    fontSize: 36,
    lineHeight: 40,
    color: 'rgba(255,255,255,0.94)',
  },
  lead: { color: 'rgba(255,255,255,0.88)', maxWidth: 340 },
  panel: {
    borderRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  panelTitle: {
    ...typography.titleSm,
  },
  panelHint: {
    fontFamily: fonts.body,
    fontSize: 14,
    marginTop: 4,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: spacing.sm,
  },
  legalBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  legalText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  error: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  socialBtn: {
    height: 52,
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  appleBtn: {
    backgroundColor: '#000',
  },
  appleLabel: {
    color: '#fff',
    fontFamily: fonts.bodyBold,
    fontSize: 16,
  },
  googleBtn: {
    borderWidth: 1.5,
  },
  googleG: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
  },
  googleLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: spacing.md,
  },
  divider: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  secondaryLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  secondaryPrimary: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
  },
  secondaryMuted: {
    fontFamily: fonts.body,
    fontSize: 14,
  },
  demoHint: {
    textAlign: 'center',
    marginTop: spacing.xs,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
});
