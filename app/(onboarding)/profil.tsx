import { router } from 'expo-router';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { OnboardingShell } from '../../src/components/OnboardingShell';
import { colors, fonts, radii, spacing } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';

export default function ProfilOnboardingScreen() {
  const { draft, setDraft, completeOnboarding } = useAuth();

  const finish = async () => {
    await completeOnboarding();
    router.replace('/(tabs)/home');
  };

  return (
    <OnboardingShell
      step={5}
      title="Ton profil"
      subtitle="Dernière touche avant de découvrir tes jumelages."
      nextLabel="Voir mes jumelages"
      onNext={finish}
      nextDisabled={!draft.name.trim() || !draft.city.trim()}
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
