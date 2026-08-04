import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Chip } from '../../src/components/ui';
import { OnboardingShell } from '../../src/components/OnboardingShell';
import {
  Availability,
  Level,
  availabilities,
  levels,
  objectives,
} from '../../src/constants/catalog';
import { colors, fonts, spacing } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';

export default function DisposScreen() {
  const { draft, setDraft } = useAuth();

  const toggleAvailability = (id: Availability) => {
    setDraft({
      availability: draft.availability.includes(id)
        ? draft.availability.filter((a) => a !== id)
        : [...draft.availability, id],
    });
  };

  const toggleObjective = (objective: string) => {
    setDraft({
      objectives: draft.objectives.includes(objective)
        ? draft.objectives.filter((o) => o !== objective)
        : [...draft.objectives, objective],
    });
  };

  return (
    <OnboardingShell
      step={4}
      title="Dispos & niveau"
      subtitle="Créneaux, niveau et objectifs — le moteur s’en sert."
      onNext={() => router.push('/(onboarding)/profil')}
      nextDisabled={draft.availability.length === 0 || draft.objectives.length === 0}
    >
      <Text style={styles.section}>Disponibilités</Text>
      <View style={styles.wrap}>
        {availabilities.map((item) => (
          <Chip
            key={item.id}
            name={item.id}
            label={item.label}
            selected={draft.availability.includes(item.id)}
            onPress={() => toggleAvailability(item.id)}
          />
        ))}
      </View>

      <Text style={styles.section}>Niveau</Text>
      <View style={styles.wrap}>
        {levels.map((item) => (
          <Chip
            key={item.id}
            label={item.label}
            selected={draft.level === item.id}
            onPress={() => setDraft({ level: item.id as Level })}
          />
        ))}
      </View>

      <Text style={styles.section}>Objectifs</Text>
      <View style={styles.wrap}>
        {objectives.map((item) => (
          <Chip
            key={item}
            label={item}
            selected={draft.objectives.includes(item)}
            onPress={() => toggleObjective(item)}
          />
        ))}
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  section: {
    fontFamily: fonts.bodyBold,
    color: colors.ink,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
});
