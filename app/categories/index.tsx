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
import { CategoryIcon } from '../../src/components/CategoryIcon';
import { ThemeSwitcherButton } from '../../src/components/ThemeSwitcher';
import { HeaderRow } from '../../src/components/ui';
import {
  type UniverseId,
  categories,
  findInterestInCatalog,
  getVibesForUniverses,
  interestCatalog,
} from '../../src/constants/catalog';
import { fonts, radii, spacing } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';

function goBackSafe() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace('/(tabs)/home');
}

export default function CategoriesScreen() {
  const { colors } = useTheme();
  const { user, updateProfile } = useAuth();
  const [selected, setSelected] = useState<UniverseId[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!user) return;
    setSelected([...user.universes]);
  }, [user]);

  const countLabel = useMemo(() => {
    if (selected.length === 0) return 'Choisis au moins une catégorie';
    if (selected.length === 1) return '1 catégorie sélectionnée';
    return `${selected.length} catégories sélectionnées`;
  }, [selected.length]);

  const toggle = (id: UniverseId) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id],
    );
    setError(undefined);
  };

  const onValidate = async () => {
    if (!user) return;
    if (selected.length === 0) {
      setError('Sélectionne au moins une catégorie.');
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const allowedLabels = new Set(
        selected.flatMap((u) => interestCatalog[u] ?? []),
      );
      const interests = user.interests.filter((i) => allowedLabels.has(i));
      const subCategoryIds = interests
        .map((label) => findInterestInCatalog(label)?.id)
        .filter((id): id is string => Boolean(id));
      const allowedVibes = new Set(
        getVibesForUniverses(selected).map((v) => v.id),
      );
      const vibes = user.vibes.filter((v) => allowedVibes.has(v));

      await updateProfile({
        universes: selected,
        interests,
        subCategoryIds,
        vibes,
      });
      goBackSafe();
    } catch {
      setError('Impossible d’enregistrer. Réessaie.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Atmosphere variant="soft">
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.top}>
          <Pressable
            style={[
              styles.back,
              { backgroundColor: colors.white, borderColor: colors.border },
            ]}
            onPress={goBackSafe}
            accessibilityRole="button"
            accessibilityLabel="Retour"
            disabled={busy}
          >
            <Ionicons name="arrow-back" size={20} color={colors.ink} />
          </Pressable>
          <ThemeSwitcherButton />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <HeaderRow
            title="Mes catégories"
            subtitle="Sélectionne les univers qui te correspondent — tu peux en choisir plusieurs."
          />

          <Text style={[styles.count, { color: colors.inkMuted }]}>
            {countLabel}
          </Text>

          <View style={styles.list}>
            {categories.map((cat) => {
              const isOn = selected.includes(cat.id);
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => toggle(cat.id)}
                  disabled={busy}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isOn }}
                  accessibilityLabel={cat.label}
                  style={[
                    styles.card,
                    {
                      backgroundColor: isOn ? colors.primarySoft : colors.white,
                      borderColor: isOn ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <CategoryIcon universeId={cat.id} />
                  <View style={styles.cardCopy}>
                    <Text style={[styles.cardLabel, { color: colors.ink }]}>
                      {cat.label}
                    </Text>
                    <Text style={[styles.cardHint, { color: colors.inkMuted }]}>
                      {cat.description}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.check,
                      {
                        backgroundColor: isOn ? colors.primary : colors.white,
                        borderColor: isOn ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    {isOn ? (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {error ? (
            <Text style={[styles.error, { color: colors.accent }]}>{error}</Text>
          ) : null}

          <Pressable
            style={[
              styles.cta,
              {
                backgroundColor: colors.primary,
                opacity: busy || selected.length === 0 ? 0.55 : 1,
              },
            ]}
            onPress={onValidate}
            disabled={busy || selected.length === 0}
            accessibilityRole="button"
            accessibilityLabel="Valider les catégories"
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text
                style={{
                  color: '#fff',
                  fontFamily: fonts.bodyBold,
                  textAlign: 'center',
                  fontSize: 16,
                }}
              >
                Valider
              </Text>
            )}
          </Pressable>
        </ScrollView>
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
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl ?? 48,
    flexGrow: 1,
  },
  count: {
    marginTop: spacing.md,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  list: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderRadius: radii.lg ?? 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  cardCopy: {
    flex: 1,
    gap: 2,
  },
  cardLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
  },
  cardHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    marginTop: spacing.md,
    fontFamily: fonts.body,
    fontSize: 13,
    textAlign: 'center',
  },
  cta: {
    marginTop: spacing.lg,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    minHeight: 52,
  },
});
