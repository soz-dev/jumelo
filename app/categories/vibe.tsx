import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Atmosphere } from '../../src/components/Atmosphere';
import { ThemeSwitcherButton } from '../../src/components/ThemeSwitcher';
import { findInterestInCatalog, getVibesForUniverses, type Vibe } from '../../src/constants/catalog';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { fonts, Icon, radii, spacing } from '../../src/design-system';
import {
  MAX_PROFILE_VIBES,
  MIN_PROFILE_VIBES,
  toggleVibeSelection,
} from '../../src/lib/vibes';

export default function CategoriesVibeScreen() {
  const { draft, setDraft, user, updateProfile } = useAuth();
  const { colors } = useTheme();

  // Seed le draft depuis le profil si on arrive directement sans passer par /categories
  useEffect(() => {
    if (draft.universes.length === 0 && user?.universes?.length) {
      setDraft({
        universes: [...user.universes],
        interests: [...user.interests],
        vibes: [...user.vibes],
      });
    }
  }, []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const availableVibes = useMemo(
    () => getVibesForUniverses(draft.universes),
    [draft.universes],
  );

  useEffect(() => {
    const allowed = new Set(availableVibes.map((v) => v.id));
    const filtered = draft.vibes.filter((id) => allowed.has(id));
    if (filtered.length !== draft.vibes.length) setDraft({ vibes: filtered });
  }, [availableVibes, draft.vibes, setDraft]);

  const toggle = (id: Vibe) => {
    setDraft({ vibes: toggleVibeSelection(draft.vibes, id) });
  };

  const count = draft.vibes.length;
  const atMax = count >= MAX_PROFILE_VIBES;
  const nextDisabled = count < MIN_PROFILE_VIBES || busy;

  const onSave = async () => {
    if (!user) return;
    setBusy(true);
    setError(undefined);
    try {
      const interests = draft.interests;
      const subCategoryIds = interests
        .map((label) => findInterestInCatalog(label)?.id)
        .filter((id): id is string => Boolean(id));
      await updateProfile({
        universes: draft.universes,
        interests,
        subCategoryIds,
        vibes: draft.vibes,
      });
      router.navigate('/(tabs)/profile');
    } catch {
      setError('Impossible d\u2019enregistrer. R\u00e9essaie.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Atmosphere variant="soft">
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.top}>
          <Pressable
            style={[styles.backBtn, { backgroundColor: colors.white, borderColor: colors.border }]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Retour"
            disabled={busy}
          >
            <Ionicons name="arrow-back" size={20} color={colors.ink} />
          </Pressable>
          <ThemeSwitcherButton />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={[styles.title, { color: colors.ink }]}>Ma vibe</Text>
          <Text style={[styles.subtitle, { color: colors.inkMuted }]}>
            Comment tu aimes jumeler — choisis jusqu&apos;à 3 vibes.
          </Text>

          <Text style={[styles.hintBar, { color: colors.inkMuted }]}>
            {count === 0
              ? `Choisis jusqu\u2019\u00e0 3 vibes`
              : atMax
                ? `${count}/${MAX_PROFILE_VIBES} vibes \u2014 maximum atteint`
                : `${count}/${MAX_PROFILE_VIBES} vibes s\u00e9lectionn\u00e9es`}
          </Text>

          <View style={styles.list}>
            {availableVibes.map((vibe) => {
              const selected = draft.vibes.includes(vibe.id);
              const locked = atMax && !selected;
              return (
                <Pressable
                  key={vibe.id}
                  onPress={() => toggle(vibe.id)}
                  disabled={locked || busy}
                  style={[
                    styles.card,
                    {
                      backgroundColor: selected ? colors.accentSoft : colors.white,
                      borderColor: selected ? colors.accent : colors.border,
                      opacity: locked ? 0.45 : 1,
                    },
                  ]}
                >
                  <View style={[styles.iconBox, { backgroundColor: selected ? colors.accent : colors.primarySoft }]}>
                    <Icon
                      name={vibe.icon}
                      size={18}
                      color={selected ? '#fff' : colors.primaryDark}
                      weight="bold"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.vibeLabel, { color: colors.ink }]}>{vibe.label}</Text>
                    <Text style={[styles.vibeHint, { color: colors.inkMuted }]}>{vibe.hint}</Text>
                  </View>
                  {selected ? (
                    <Icon name="check" size={22} color={colors.accent} weight="fill" />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {error ? (
          <Text style={[styles.footerError, { color: colors.accent }]}>{error}</Text>
        ) : null}

        <Pressable
          style={[styles.cta, { backgroundColor: colors.primary, opacity: nextDisabled ? 0.55 : 1 }]}
          onPress={onSave}
          disabled={nextDisabled}
          accessibilityRole="button"
          accessibilityLabel="Enregistrer le profil"
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontFamily: fonts.bodyBold, textAlign: 'center', fontSize: 16 }}>
              Enregistrer
            </Text>
          )}
        </Pressable>
      </SafeAreaView>
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  title: {
    fontFamily: fonts.displaySemi,
    fontSize: 28,
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
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
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vibeLabel: {
    fontFamily: fonts.displaySemi,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  vibeHint: {
    fontFamily: fonts.body,
    marginTop: 4,
  },
  footerError: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    textAlign: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  cta: {
    margin: spacing.lg,
    marginTop: spacing.sm,
    borderRadius: radii.pill,
    paddingVertical: 16,
  },
});
