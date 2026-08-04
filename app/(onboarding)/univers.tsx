import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CategoryIcon } from '../../src/components/CategoryIcon';
import { OnboardingShell } from '../../src/components/OnboardingShell';
import { UniverseId, categories } from '../../src/constants/catalog';
import { fonts, radii, spacing } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';

export default function UniversScreen() {
  const { draft, setDraft } = useAuth();
  const { colors } = useTheme();

  const toggle = (id: UniverseId) => {
    const exists = draft.universes.includes(id);
    setDraft({
      universes: exists
        ? draft.universes.filter((u) => u !== id)
        : [...draft.universes, id],
    });
  };

  return (
    <OnboardingShell
      step={1}
      title="Tes univers"
      subtitle="Choisis un ou plusieurs terrains de jeu pour ton jumelage."
      onNext={() => router.push('/(onboarding)/interets')}
      nextDisabled={draft.universes.length === 0}
    >
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {categories.map((universe) => {
          const selected = draft.universes.includes(universe.id);
          return (
            <Pressable
              key={universe.id}
              onPress={() => toggle(universe.id)}
              style={[
                styles.card,
                {
                  backgroundColor: selected ? colors.primarySoft : colors.white,
                  borderColor: selected ? colors.primary : colors.border,
                },
              ]}
            >
              <CategoryIcon universeId={universe.id} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.ink }]}>{universe.label}</Text>
                <Text style={[styles.desc, { color: colors.inkMuted }]}>
                  {universe.description}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm, paddingBottom: spacing.lg },
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1.5,
  },
  label: {
    fontFamily: fonts.displaySemi,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  desc: {
    fontFamily: fonts.body,
    marginTop: 2,
  },
});
