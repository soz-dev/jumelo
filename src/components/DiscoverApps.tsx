import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useTheme } from '../context/ThemeContext';
import { fonts, radii, spacing } from '../design-system';

/**
 * Apps Sofyan Zarouri — iTunes Lookup (fr), août 2026.
 * Motastic  → id6760564637
 * Dev Mastery → id6759505533
 */
export const DISCOVER_APPS = [
  {
    id: 'motastic',
    name: 'Motastic',
    blurb: 'Motivation quotidienne, rituels et boosts pour avancer.',
    artwork:
      'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/df/76/ab/df76ab93-54de-db7d-1f3f-57de5f610e87/AppIcon-0-0-1x_U007emarketing-0-6-0-85-220.png/512x512bb.jpg',
    url: 'https://apps.apple.com/fr/app/motastic/id6760564637',
  },
  {
    id: 'dev-mastery',
    name: 'Dev Mastery',
    blurb: 'Apprends Swift & SwiftUI avec des défis concrets.',
    artwork:
      'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/38/a2/93/38a29332-7c08-0a11-251c-6585c877e338/AppIcon-0-0-1x_U007ephone-0-1-85-220.png/512x512bb.jpg',
    url: 'https://apps.apple.com/fr/app/dev-mastery/id6759505533',
  },
] as const;

export function DiscoverAppsSection() {
  const { colors } = useTheme();

  return (
    <Animated.View entering={FadeInDown.delay(120).duration(360)} style={styles.wrap}>
      <Text style={styles.title}>
        <Text style={{ color: colors.primaryDark }}>À </Text>
        <Text style={{ color: colors.primary }}>découvrir</Text>
      </Text>
      <Text style={[styles.subtitle, { color: colors.inkMuted }]}>
        D’autres apps du créateur de Jumelo
      </Text>
      <View style={styles.row}>
        {DISCOVER_APPS.map((app) => (
          <Pressable
            key={app.id}
            onPress={() => {
              void Linking.openURL(app.url);
            }}
            style={[
              styles.card,
              { backgroundColor: colors.white, borderColor: colors.border },
            ]}
            accessibilityRole="link"
            accessibilityLabel={`Ouvrir ${app.name} sur l’App Store`}
          >
            <Image source={{ uri: app.artwork }} style={styles.icon} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.name, { color: colors.ink }]} numberOfLines={1}>
                {app.name}
              </Text>
              <Text style={[styles.blurb, { color: colors.inkMuted }]} numberOfLines={2}>
                {app.blurb}
              </Text>
              <Text style={[styles.cta, { color: colors.primary }]}>Voir sur l’App Store</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 22,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginBottom: 4,
  },
  row: {
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 14,
  },
  name: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  blurb: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 16,
  },
  cta: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    marginTop: 2,
  },
});
