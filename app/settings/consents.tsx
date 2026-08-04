import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  SettingsBackHeader,
  SettingsSectionLabel,
  SettingsToggleRow,
} from '../../src/components/SettingsChrome';
import { fonts, radii, spacing } from '../../src/constants/theme';
import { useTheme } from '../../src/context/ThemeContext';
import { getMarketingConsent, setMarketingConsent } from '../../src/legal';

export default function ConsentsScreen() {
  const { colors } = useTheme();
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    getMarketingConsent().then(setMarketing);
  }, []);

  const onMarketing = async (value: boolean) => {
    setMarketing(value);
    await setMarketingConsent(value);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.cream }]} edges={['top']}>
      <SettingsBackHeader title="Consentements" subtitle="Gérez vos choix" />
      <ScrollView contentContainerStyle={styles.content}>
        <SettingsSectionLabel label="Essentiels" />
        <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.ink }]}>Traitements nécessaires</Text>
          <Text style={[styles.cardBody, { color: colors.inkMuted }]}>
            Compte, profil, matching, messages, équipes, sécurité et stockage local de session :
            ces traitements sont nécessaires à l’exécution du service (contrat). Ils ne peuvent
            pas être désactivés tant que vous utilisez Jumelo. Vous pouvez supprimer votre compte
            à tout moment.
          </Text>
          <Pressable onPress={() => router.push('/settings/privacy')}>
            <Text style={[styles.link, { color: colors.primary }]}>
              Voir la politique de confidentialité
            </Text>
          </Pressable>
        </View>

        <SettingsSectionLabel label="Optionnels" />
        <SettingsToggleRow
          icon="mail-outline"
          label="E-mails marketing"
          hint="Actus produit, tips — jamais obligatoires. Retirable ici."
          value={marketing}
          onValueChange={onMarketing}
        />
        <Text style={[styles.fine, { color: colors.inkFaint }]}>
          Le retrait du consentement n’affecte pas la licéité du traitement effectué avant le
          retrait.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  card: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  cardTitle: { fontFamily: fonts.bodyBold, fontSize: 16 },
  cardBody: { fontFamily: fonts.body, fontSize: 14, lineHeight: 22 },
  link: { fontFamily: fonts.bodyBold, fontSize: 14 },
  fine: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, marginTop: spacing.sm },
});
