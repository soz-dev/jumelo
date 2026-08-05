import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Atmosphere } from '../../src/components/Atmosphere';
import { JumeloLottie } from '../../src/components/JumeloLottie';
import { ThemeSwitcherButton } from '../../src/components/ThemeSwitcher';
import { Button, TextField, fonts, radii, spacing, typography } from '../../src/design-system';
import { safeBack } from '../../src/lib/navigation';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { DEMO_EMAIL } from '../../src/data/mock';
import {
  APPLE_FIREBASE_EXPO_GO_MESSAGE,
  APPLE_WEB_UNSUPPORTED_MESSAGE,
  isExpoGoRuntime,
} from '../../src/lib/firebaseAuth';

const isWeb = Platform.OS === 'web';
/** iOS → Apple (+ Google) ; Android / web → Google. Google via AuthSession (Expo Go OK). */
const showAppleButton = Platform.OS === 'ios';
const showGoogleButton = true;
const showDemo = typeof __DEV__ !== 'undefined' && __DEV__;

export default function LoginScreen() {
  const { login, loginWithProvider } = useAuth();
  const { colors } = useTheme();
  const [email, setEmail] = useState(showDemo ? DEMO_EMAIL : '');
  const [password, setPassword] = useState(showDemo ? 'jumelo' : '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'apple' | 'google' | null>(null);

  const onSubmit = async () => {
    setLoading(true);
    setError('');
    const result = await login(email, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.replace('/');
  };

  const onOAuth = async (provider: 'apple' | 'google') => {
    if (provider === 'apple' && isWeb) {
      setError(APPLE_WEB_UNSUPPORTED_MESSAGE);
      return;
    }
    if (provider === 'apple' && isExpoGoRuntime()) {
      Alert.alert(
        'Apple indisponible dans Expo Go',
        APPLE_FIREBASE_EXPO_GO_MESSAGE,
        [{ text: 'OK' }],
      );
      return;
    }
    // Pas de confirm/Alert avant Google : ça casse le geste → popup bloquée (même sur PC).
    setOauthLoading(provider);
    setError('');
    const result = await loginWithProvider(provider);
    setOauthLoading(null);
    if (!result.ok) {
      if (!result.cancelled) setError(result.error);
      return;
    }
    router.replace('/');
  };

  return (
    <Atmosphere variant="soft">
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Pressable onPress={() => safeBack('/(auth)/welcome')}>
          <Text style={{ color: colors.primary, fontFamily: fonts.bodyMedium }}>← Retour</Text>
        </Pressable>
        <ThemeSwitcherButton />
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.wrap}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroLottie}>
            <JumeloLottie name="spark" size={64} />
          </View>
          <View style={[styles.icon, { backgroundColor: colors.primary }]}>
            <Ionicons name="log-in-outline" size={28} color="#fff" />
          </View>
          <Text style={[styles.title, { color: colors.ink }]}>Bon retour</Text>
          <Text style={[styles.sub, { color: colors.inkMuted }]}>
            Connecte-toi pour retrouver tes jumelages
          </Text>

          <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.border }]}>
            {showAppleButton ? (
              <Pressable
                style={[styles.socialBtn, { borderColor: colors.border, backgroundColor: '#000' }]}
                onPress={() => onOAuth('apple')}
                disabled={Boolean(oauthLoading) || loading}
              >
                <Ionicons name="logo-apple" size={20} color="#fff" />
                <Text style={[styles.socialLabel, { color: '#fff' }]}>
                  {oauthLoading === 'apple' ? 'Connexion…' : 'Continuer avec Apple'}
                </Text>
              </Pressable>
            ) : null}

            {showGoogleButton ? (
              <Pressable
                style={[
                  styles.socialBtn,
                  { borderColor: colors.border },
                  showAppleButton ? { marginTop: spacing.sm } : null,
                ]}
                onPress={() => onOAuth('google')}
                disabled={Boolean(oauthLoading) || loading}
              >
                <Text style={{ fontSize: 18, fontFamily: fonts.bodyBold, color: colors.ink }}>G</Text>
                <Text style={[styles.socialLabel, { color: colors.ink }]}>
                  {oauthLoading === 'google' ? 'Connexion…' : 'Continuer avec Google'}
                </Text>
              </Pressable>
            ) : null}

            <View style={styles.orRow}>
              <View style={[styles.orLine, { backgroundColor: colors.border }]} />
              <Text style={{ color: colors.inkFaint, fontFamily: fonts.bodyMedium }}>OU</Text>
              <View style={[styles.orLine, { backgroundColor: colors.border }]} />
            </View>

            <TextField
              label="Email"
              leftIcon="mail-outline"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              placeholder="toi@exemple.com"
            />
            <TextField
              label="Mot de passe"
              leftIcon="lock-closed-outline"
              secureToggle
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
            />

            {error ? <Text style={[styles.error, { color: colors.accent }]}>{error}</Text> : null}
            <Button
              label="Se connecter"
              onPress={onSubmit}
              loading={loading}
              style={{ marginTop: spacing.md }}
            />
          </View>

          <Pressable onPress={() => router.push('/(auth)/register')} style={styles.footer}>
            <Text style={{ color: colors.inkMuted, fontFamily: fonts.body }}>
              Pas encore de compte ?{' '}
              <Text style={{ color: colors.primary, fontFamily: fonts.bodyBold }}>Créer un compte</Text>
            </Text>
          </Pressable>
          {showDemo ? (
            <Text
              style={{
                textAlign: 'center',
                color: colors.inkFaint,
                marginTop: 8,
                fontFamily: fonts.body,
              }}
            >
              Démo (__DEV__) : {DEMO_EMAIL}
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  wrap: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  heroLottie: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  title: {
    ...typography.title,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  sub: { ...typography.body, textAlign: 'center', marginBottom: spacing.lg },
  card: {
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing.lg,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingVertical: 14,
  },
  socialLabel: { fontFamily: fonts.bodyMedium, fontSize: 16 },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: spacing.md,
  },
  orLine: { flex: 1, height: 1 },
  error: { fontFamily: fonts.bodyMedium, marginTop: spacing.sm },
  footer: { marginTop: spacing.lg, alignItems: 'center' },
});
