import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OnboardingShell } from '../../src/components/OnboardingShell';
import { getVibesForUniverses, type Vibe } from '../../src/constants/catalog';
import { fonts, radii, spacing } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { Icon } from '../../src/design-system';
import {
  MAX_PROFILE_VIBES,
  MIN_PROFILE_VIBES,
  toggleVibeSelection,
} from '../../src/lib/vibes';

export default function VibeScreen() {
  const { draft, setDraft } = useAuth();
  const { colors } = useTheme();

  const availableVibes = useMemo(
    () => getVibesForUniverses(draft.universes),
    [draft.universes],
  );

  useEffect(() => {
    const allowed = new Set(availableVibes.map((item) => item.id));
    const filtered = draft.vibes.filter((id) => allowed.has(id));
    if (filtered.length !== draft.vibes.length) {
      setDraft({ vibes: filtered });
    }
  }, [availableVibes, draft.vibes, setDraft]);

  const toggle = (id: Vibe) => {
    setDraft({ vibes: toggleVibeSelection(draft.vibes, id) });
  };

  const count = draft.vibes.length;
  const atMax = count >= MAX_PROFILE_VIBES;

  return (
    <OnboardingShell
      step={3}
      title="Ta vibe"
      subtitle="Comment tu aimes jumeler — choisis jusqu’à 3 vibes (idéalement 2–3)."
      onNext={() => router.push('/(onboarding)/dispos')}
      nextDisabled={count < MIN_PROFILE_VIBES}
    >
      <Text style={[styles.hintBar, { color: colors.inkMuted }]}>
        {count === 0
          ? 'Choisis jusqu’à 3 vibes'
          : atMax
            ? `${count}/${MAX_PROFILE_VIBES} vibes — maximum atteint`
            : `${count}/${MAX_PROFILE_VIBES} vibes sélectionnées`}
      </Text>
      <View style={styles.list}>
        {availableVibes.map((vibe) => {
          const selected = draft.vibes.includes(vibe.id);
          const locked = atMax && !selected;
          return (
            <Pressable
              key={vibe.id}
              onPress={() => toggle(vibe.id)}
              disabled={locked}
              style={[
                styles.card,
                {
                  backgroundColor: selected ? colors.accentSoft : colors.white,
                  borderColor: selected ? colors.accent : colors.border,
                  opacity: locked ? 0.45 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.icon,
                  { backgroundColor: selected ? colors.accent : colors.primarySoft },
                ]}
              >
                <Icon
                  name={vibe.icon}
                  size={18}
                  color={selected ? '#fff' : colors.primaryDark}
                  weight="bold"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.ink }]}>{vibe.label}</Text>
                <Text style={[styles.hint, { color: colors.inkMuted }]}>{vibe.hint}</Text>
              </View>
              {selected ? (
                <Icon name="check" size={22} color={colors.accent} weight="fill" />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  hintBar: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  list: { gap: spacing.sm },
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1.5,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: fonts.displaySemi,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  hint: {
    fontFamily: fonts.body,
    marginTop: 4,
  },
});
