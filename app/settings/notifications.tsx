import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  SettingsBackHeader,
  SettingsSectionLabel,
  SettingsToggleRow,
} from '../../src/components/SettingsChrome';
import { fonts, spacing } from '../../src/constants/theme';
import { useTheme } from '../../src/context/ThemeContext';
import { getNotifPrefs, setNotifPrefs, type NotifPrefs } from '../../src/legal';

export default function NotificationsSettingsScreen() {
  const { colors } = useTheme();
  const [prefs, setPrefs] = useState<NotifPrefs | null>(null);

  useEffect(() => {
    getNotifPrefs().then(setPrefs);
  }, []);

  const update = async (patch: Partial<NotifPrefs>) => {
    if (!prefs) return;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    await setNotifPrefs(next);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.cream }]} edges={['top']}>
      <SettingsBackHeader
        title="Notifications"
        subtitle="Préférences locales (stubs — push à brancher)"
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.note, { color: colors.inkMuted }]}>
          Ces interrupteurs mémorisent vos choix sur l’appareil. L’envoi de notifications push
          sera branché ultérieurement (APNs / FCM).
        </Text>

        <SettingsSectionLabel label="Alertes" />
        {prefs ? (
          <>
            <SettingsToggleRow
              icon="heart-outline"
              label="Nouveaux jumelages"
              hint="Quand quelqu’un jumelle avec toi"
              value={prefs.matchAlerts}
              onValueChange={(v) => update({ matchAlerts: v })}
            />
            <SettingsToggleRow
              icon="chatbubble-outline"
              label="Messages"
              hint="Nouveaux messages privés ou d’équipe"
              value={prefs.messageAlerts}
              onValueChange={(v) => update({ messageAlerts: v })}
            />
            <SettingsToggleRow
              icon="people-outline"
              label="Équipes"
              hint="Invitations et demandes d’adhésion"
              value={prefs.teamAlerts}
              onValueChange={(v) => update({ teamAlerts: v })}
            />
            <SettingsToggleRow
              icon="sparkles-outline"
              label="Conseils produit"
              hint="Astuces Jumelo (non essentiel)"
              value={prefs.productTips}
              onValueChange={(v) => update({ productTips: v })}
            />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  note: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
});
