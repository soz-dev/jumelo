import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Chip } from '../../src/components/ui';
import { OnboardingShell } from '../../src/components/OnboardingShell';
import { interestCatalog } from '../../src/constants/catalog';
import { colors, fonts, spacing } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';

export default function InteretsScreen() {
  const { draft, setDraft } = useAuth();

  const toggle = (interest: string) => {
    setDraft({
      interests: draft.interests.includes(interest)
        ? draft.interests.filter((i) => i !== interest)
        : [...draft.interests, interest],
    });
  };

  const sections = draft.universes.length
    ? draft.universes
    : (Object.keys(interestCatalog) as Array<keyof typeof interestCatalog>);

  return (
    <OnboardingShell
      step={2}
      title="Tes intérêts"
      subtitle="Tags ouverts : sélectionne ce qui te définit vraiment."
      onNext={() => router.push('/(onboarding)/vibe')}
      nextDisabled={draft.interests.length === 0}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {sections.map((universeId) => (
          <View key={universeId} style={styles.section}>
            <Text style={styles.sectionTitle}>{universeId}</Text>
            <View style={styles.wrap}>
              {interestCatalog[universeId].map((interest) => (
                <Chip
                  key={interest}
                  label={interest}
                  selected={draft.interests.includes(interest)}
                  onPress={() => toggle(interest)}
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.lg },
  sectionTitle: {
    fontFamily: fonts.bodyBold,
    color: colors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    fontSize: 12,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
});
