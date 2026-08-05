import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Atmosphere } from '../src/components/Atmosphere';
import { Button } from '../src/design-system';
import { fonts, radii, spacing } from '../src/constants/theme';
import { useTheme } from '../src/context/ThemeContext';
import { safeBack } from '../src/lib/navigation';

const BENEFITS = [
  {
    icon: 'heart-outline' as const,
    title: 'Voir qui veut jumeler',
    hint: 'Invites reçues et activité « veut jumeler »',
  },
  {
    icon: 'person-outline' as const,
    title: 'Profils complets',
    hint: 'Ouvre les fiches détaillées des autres membres',
  },
  {
    icon: 'sparkles-outline' as const,
    title: 'Priorité jumelage',
    hint: 'Bientôt — plus de visibilité sur le Jumelo du jour',
  },
];

export default function PremiumPaywallScreen() {
  const { colors } = useTheme();

  const onSubscribeStub = () => {
    Alert.alert(
      'Bientôt disponible',
      'L’abonnement Premium n’est pas encore branché. Reviens bientôt — ou demande un accès à l’admin.',
    );
  };

  return (
    <Atmosphere variant="soft">
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => safeBack('/(tabs)/home')}
            style={[styles.closeBtn, { backgroundColor: colors.white, borderColor: colors.border }]}
            accessibilityLabel="Fermer"
          >
            <Ionicons name="close" size={22} color={colors.ink} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.heroIcon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="diamond" size={36} color={colors.primaryDark} />
          </View>
          <Text style={[styles.title, { color: colors.ink }]}>Jumelo Premium</Text>
          <Text style={[styles.sub, { color: colors.inkMuted }]}>
            Débloque les invites, les profils complets et bientôt d’autres avantages exclusifs.
          </Text>

          <View style={styles.benefits}>
            {BENEFITS.map((b) => (
              <View
                key={b.title}
                style={[styles.benefitRow, { backgroundColor: colors.white, borderColor: colors.border }]}
              >
                <View style={[styles.benefitIcon, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name={b.icon} size={20} color={colors.primaryDark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.benefitTitle, { color: colors.ink }]}>{b.title}</Text>
                  <Text style={{ color: colors.inkMuted, fontFamily: fonts.body, fontSize: 13 }}>
                    {b.hint}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <Button
            label="S’abonner — bientôt"
            icon="card-outline"
            onPress={onSubscribeStub}
            variant="accent"
          />
          <Button
            label="Pas maintenant"
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace('/(tabs)/home');
            }}
            variant="ghost"
            style={{ marginTop: spacing.sm }}
          />
          <Text style={[styles.footnote, { color: colors.inkFaint }]}>
            Stub MVP — aucun paiement n’est traité pour l’instant.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: 'flex-end',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    alignItems: 'stretch',
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.displaySemi,
    fontSize: 28,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  benefits: { gap: 10, marginBottom: spacing.xl },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 14,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    marginBottom: 2,
  },
  footnote: {
    fontFamily: fonts.body,
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
