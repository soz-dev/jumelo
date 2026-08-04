import { type Href, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../src/components/ui';
import { fonts, radii, spacing } from '../../src/constants/theme';
import { useTheme } from '../../src/context/ThemeContext';
import { LEGAL_VERSION, acceptLegal } from '../../src/legal';

export default function LegalAcceptScreen() {
  const { colors } = useTheme();
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  const onAccept = async () => {
    if (!checked) return;
    setLoading(true);
    await acceptLegal(LEGAL_VERSION);
    setLoading(false);
    router.replace('/');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.cream }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.brand, { color: colors.primary }]}>Jumelo</Text>
        <Text style={[styles.title, { color: colors.ink }]}>Avant de continuer</Text>
        <Text style={[styles.lead, { color: colors.inkMuted }]}>
          Merci de prendre connaissance de nos documents et d’accepter les conditions pour
          utiliser le service (version {LEGAL_VERSION}).
        </Text>

        <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.border }]}>
          <LinkRow label="Règles Jumelo" href="/settings/rules" />
          <LinkRow label="Conditions générales d’utilisation" href="/settings/cgu" />
          <LinkRow label="Politique de confidentialité (RGPD)" href="/settings/privacy" />
        </View>

        <Pressable
          onPress={() => setChecked((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
          style={styles.checkRow}
        >
          <View
            style={[
              styles.box,
              {
                borderColor: checked ? colors.primary : colors.border,
                backgroundColor: checked ? colors.primary : colors.white,
              },
            ]}
          >
            {checked ? <Text style={styles.tick}>✓</Text> : null}
          </View>
          <Text style={[styles.checkLabel, { color: colors.ink }]}>
            J’ai au moins 16 ans et j’accepte les règles Jumelo, les CGU et la Politique de
            confidentialité.
          </Text>
        </Pressable>

        <Button
          label="Continuer"
          onPress={onAccept}
          disabled={!checked}
          loading={loading}
          style={{ marginTop: spacing.lg }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function LinkRow({ label, href }: { label: string; href: Href }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={() => router.push(href)} style={styles.linkRow}>
      <Text style={[styles.linkText, { color: colors.primary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  brand: { fontFamily: fonts.display, fontSize: 28 },
  title: {
    fontFamily: fonts.displaySemi,
    fontSize: 26,
    marginTop: spacing.sm,
    letterSpacing: -0.5,
  },
  lead: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 24,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  card: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  linkRow: { paddingVertical: 4 },
  linkText: { fontFamily: fonts.bodyBold, fontSize: 15 },
  checkRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: spacing.xl,
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
    fontSize: 15,
    lineHeight: 22,
  },
});
