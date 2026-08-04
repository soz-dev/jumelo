import Constants from 'expo-constants';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemeSwitcherButton } from '../../src/components/ThemeSwitcher';
import {
  SettingsBackHeader,
  SettingsRow,
  SettingsSectionLabel,
} from '../../src/components/SettingsChrome';
import { fonts, spacing } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { LEGAL_VERSION } from '../../src/legal';
import { useIsAdmin } from '../../src/lib/admin';

export default function SettingsHubScreen() {
  const { user, logout } = useAuth();
  const { colors, palette } = useTheme();
  const isAdmin = useIsAdmin();
  const appVersion =
    Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '1.0.0';

  const onLogout = async () => {
    await logout();
    router.replace('/(auth)/welcome');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.cream }]} edges={['top']}>
      <SettingsBackHeader title="Paramètres" subtitle="Compte, préférences & conformité" />
      <ScrollView contentContainerStyle={styles.content}>
        <SettingsSectionLabel label="Compte" />
        <SettingsRow
          icon="person-outline"
          label={user?.name ?? 'Mon compte'}
          hint={user?.email ?? 'Profil connecté'}
        />
        <SettingsRow
          icon="color-palette-outline"
          label="Thème"
          hint={`Actuel : ${palette.label} — bouton ci-contre ou sur le profil`}
          right={<ThemeSwitcherButton />}
        />

        <SettingsSectionLabel label="Préférences" />
        <SettingsRow
          icon="notifications-outline"
          label="Notifications"
          hint="Alertes match, messages, équipes"
          onPress={() => router.push('/settings/notifications')}
        />
        <SettingsRow
          icon="checkmark-circle-outline"
          label="Consentements"
          hint="Marketing optionnel · traitements essentiels"
          onPress={() => router.push('/settings/consents')}
        />

        <SettingsSectionLabel label="Mes données (RGPD)" />
        <SettingsRow
          icon="download-outline"
          label="Exporter / supprimer"
          hint="Portabilité, effacement, politique"
          onPress={() => router.push('/settings/data')}
        />

        <SettingsSectionLabel label="Légal & confidentialité" />
        <SettingsRow
          icon="document-text-outline"
          label="Conditions générales (CGU)"
          onPress={() => router.push('/settings/cgu')}
        />
        <SettingsRow
          icon="shield-checkmark-outline"
          label="Politique de confidentialité"
          hint="RGPD"
          onPress={() => router.push('/settings/privacy')}
        />
        <SettingsRow
          icon="business-outline"
          label="Mentions légales"
          onPress={() => router.push('/settings/mentions')}
        />
        <SettingsRow
          icon="people-outline"
          label="Charte communauté"
          onPress={() => router.push('/settings/community')}
        />
        <SettingsRow
          icon="phone-portrait-outline"
          label="Traceurs & stockage local"
          onPress={() => router.push('/settings/cookies')}
        />

        {isAdmin ? (
          <>
            <SettingsSectionLabel label="Administration" />
            <SettingsRow
              icon="shield-outline"
              label="Admin · Modération"
              hint="Membres, messages, images"
              onPress={() => router.push('/admin')}
            />
          </>
        ) : null}

        <SettingsSectionLabel label="Session" />
        <SettingsRow
          icon="log-out-outline"
          label="Se déconnecter"
          danger
          onPress={onLogout}
        />

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.inkFaint }]}>
            Jumelo · v{appVersion}
          </Text>
          <Text style={[styles.footerText, { color: colors.inkFaint }]}>
            Documents juridiques · {LEGAL_VERSION}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  footer: { marginTop: spacing.xl, alignItems: 'center', gap: 4 },
  footerText: { fontFamily: fonts.body, fontSize: 12 },
});
