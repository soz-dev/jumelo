import { router } from 'expo-router';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { OnboardingShell } from '../../src/components/OnboardingShell';
import { colors, fonts, radii, spacing } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';

function parseAge(raw: string): number | null {
  const n = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(n) || n < 13 || n > 100) return null;
  return n;
}

export default function ProfilOnboardingScreen() {
  const { draft, setDraft, completeOnboarding } = useAuth();
  const ageOk = parseAge(draft.age ?? '') != null;

  const finish = async () => {
    await completeOnboarding();
    router.replace('/(tabs)/home');
  };

  return (
    <OnboardingShell
      step={5}
      title="Ton profil"
      subtitle="Dernière touche — l’âge aide à te proposer un binôme proche de toi."
      nextLabel="Trouve ton jumelo !"
      onNext={finish}
      nextDisabled={!draft.name.trim() || !draft.city.trim() || !ageOk}
    >
      <View style={styles.form}>
        <Text style={styles.label}>Prénom</Text>
        <TextInput
          value={draft.name}
          onChangeText={(name) => setDraft({ name })}
          placeholder="Léa"
          placeholderTextColor={colors.inkFaint}
          style={styles.input}
        />
        <Text style={styles.label}>Âge</Text>
        <TextInput
          value={draft.age ?? ''}
          onChangeText={(age) => setDraft({ age: age.replace(/[^\d]/g, '').slice(0, 3) })}
          placeholder="22"
          placeholderTextColor={colors.inkFaint}
          keyboardType="number-pad"
          style={styles.input}
          maxLength={3}
        />
        <Text style={styles.label}>Ville</Text>
        <TextInput
          value={draft.city}
          onChangeText={(city) => setDraft({ city })}
          placeholder="Lyon"
          placeholderTextColor={colors.inkFaint}
          style={styles.input}
        />
        <Text style={styles.label}>Bio courte</Text>
        <TextInput
          value={draft.bio}
          onChangeText={(bio) => setDraft({ bio })}
          placeholder="Ce que tu cherches en 1–2 phrases"
          placeholderTextColor={colors.inkFaint}
          style={[styles.input, styles.bio]}
          multiline
        />
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.sm },
  label: {
    fontFamily: fonts.bodyMedium,
    color: colors.inkMuted,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
  },
  bio: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
});
