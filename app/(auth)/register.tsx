import { Ionicons } from '@expo/vector-icons';
import { type Href, router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { safeBack } from '../../src/lib/navigation';

import { Atmosphere } from '../../src/components/Atmosphere';
import { JumeloLottie } from '../../src/components/JumeloLottie';
import { Button, Subtitle, Title } from '../../src/components/ui';
import { fonts, radii, spacing } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { LEGAL_VERSION, acceptLegal } from '../../src/legal';
import {
  APPLE_FIREBASE_EXPO_GO_MESSAGE,
  APPLE_WEB_UNSUPPORTED_MESSAGE,
  isExpoGoRuntime,
} from '../../src/lib/firebaseAuth';

const isWeb = Platform.OS === 'web';
/** iPhone → Apple ; Android / web → Google. */
const showAppleButton = Platform.OS === 'ios';
const showGoogleButton = Platform.OS === 'android' || isWeb;

export default function RegisterScreen() {
  const { register, loginWithProvider } = useAuth();
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [legalChecked, setLegalChecked] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'apple' | 'google' | null>(null);

  const requireLegal = () => {
    if (!legalChecked) {
      setError('Accepte les règles Jumelo pour créer ton compte.');
      return false;
    }
    return true;
  };

  const onSubmit = async () => {
    if (!requireLegal()) return;
    setLoading(true);
    setError('');
    const result = await register(name, email, password);
    if (!result.ok) {
      setLoading(false);
      setError(result.error);
      return;
    }
    await acceptLegal(LEGAL_VERSION);
    setLoading(false);
    router.replace('/(onboarding)/univers');
  };

  const onOAuth = async (provider: 'apple' | 'google') => {
    if (!requireLegal()) return;
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
    await acceptLegal(LEGAL_VERSION);
    router.replace('/');
  };

  return (
    <Atmosphere variant="soft">
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.wrap}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        <Pressable onPress={() => safeBack('/(auth)/welcome')}>
          <Text style={[styles.back, { color: colors.primary }]}>← Retour</Text>
        </Pressable>
        <View style={styles.heroLottie}>
          <JumeloLottie name="bolt" size={72} />
        </View>
        <Title>Créer ton compte</Title>
        <Subtitle style={{ marginTop: spacing.sm }}>
          {showAppleButton
            ? 'Le plus simple : Continuer avec Apple. Puis on calibre ton jumelage.'
            : 'Le plus simple : Continuer avec Google. Puis on calibre ton jumelage.'}
        </Subtitle>

        <View style={styles.checkRow}>
          <Pressable
            onPress={() => setLegalChecked((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: legalChecked }}
            hitSlop={12}
          >
            <View
              style={[
                styles.box,
                {
                  borderColor: legalChecked ? colors.primary : colors.border,
                  backgroundColor: legalChecked ? colors.primary : colors.white,
                },
              ]}
            >
              {legalChecked ? <Text style={styles.tick}>✓</Text> : null}
            </View>
          </Pressable>
          <Text style={[styles.checkLabel, { color: colors.ink }]}>
            <Text onPress={() => setLegalChecked((v) => !v)}>
              J’ai au moins 16 ans et j’accepte les{' '}
            </Text>
            <Text
              style={{ color: colors.primary, fontFamily: fonts.bodyBold }}
              onPress={() => router.push('/settings/rules' as Href)}
            >
              règles Jumelo
            </Text>
            <Text onPress={() => setLegalChecked((v) => !v)}>{' '}(dont les{' '}</Text>
            <Text
              style={{ color: colors.primary, fontFamily: fonts.bodyBold }}
              onPress={() => router.push('/settings/cgu' as Href)}
            >
              CGU
            </Text>
            <Text onPress={() => setLegalChecked((v) => !v)}>{' '}et la{' '}</Text>
            <Text
              style={{ color: colors.primary, fontFamily: fonts.bodyBold }}
              onPress={() => router.push('/settings/privacy' as Href)}
            >
              confidentialité
            </Text>
            <Text onPress={() => setLegalChecked((v) => !v)}>).</Text>
          </Text>
        </View>
        {error && !legalChecked ? (
          <Text style={[styles.error, { color: colors.accent }]}>{error}</Text>
        ) : null}

        <View style={styles.socialBlock}>
          {showAppleButton ? (
            <Pressable
              style={[
                styles.socialBtn,
                { backgroundColor: '#000', opacity: legalChecked ? 1 : 0.55 },
              ]}
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
                {
                  backgroundColor: colors.white,
                  borderWidth: 1,
                  borderColor: colors.border,
                  opacity: legalChecked ? 1 : 0.55,
                },
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
        </View>

        <View style={styles.orRow}>
          <View style={[styles.orLine, { backgroundColor: colors.border }]} />
          <Text style={{ fontFamily: fonts.bodyMedium, color: colors.inkFaint }}>ou par email</Text>
          <View style={[styles.orLine, { backgroundColor: colors.border }]} />
        </View>

        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.inkMuted }]}>Prénom</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Léa"
            placeholderTextColor={colors.inkFaint}
            style={[
              styles.input,
              {
                backgroundColor: colors.white,
                borderColor: colors.border,
                color: colors.ink,
              },
            ]}
          />
          <Text style={[styles.label, { color: colors.inkMuted }]}>Email</Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholder="toi@jumelo.app"
            placeholderTextColor={colors.inkFaint}
            style={[
              styles.input,
              {
                backgroundColor: colors.white,
                borderColor: colors.border,
                color: colors.ink,
              },
            ]}
          />
          <Text style={[styles.label, { color: colors.inkMuted }]}>Mot de passe (8 car. min.)</Text>
          <TextInput
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.inkFaint}
            style={[
              styles.input,
              {
                backgroundColor: colors.white,
                borderColor: colors.border,
                color: colors.ink,
              },
            ]}
          />

          {error && legalChecked ? (
            <Text style={[styles.error, { color: colors.accent }]}>{error}</Text>
          ) : null}
          <Button
            label="Continuer"
            onPress={onSubmit}
            loading={loading}
            disabled={!legalChecked || loading}
          />
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  wrap: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  heroLottie: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  back: {
    fontFamily: fonts.bodyMedium,
    marginBottom: spacing.lg,
  },
  socialBlock: { marginTop: spacing.md, gap: spacing.sm },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: radii.md,
    paddingVertical: 14,
  },
  socialLabel: { fontFamily: fonts.bodyMedium, fontSize: 16 },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: spacing.lg,
  },
  orLine: { flex: 1, height: 1 },
  form: { marginTop: spacing.md, gap: spacing.sm },
  label: {
    fontFamily: fonts.bodyMedium,
    marginTop: spacing.sm,
  },
  input: {
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontFamily: fonts.body,
    fontSize: 16,
  },
  checkRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    alignItems: 'flex-start',
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  tick: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 14 },
  checkLabel: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
  },
  error: {
    fontFamily: fonts.bodyMedium,
    marginVertical: spacing.sm,
  },
});
