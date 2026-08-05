import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Atmosphere } from '../../src/components/Atmosphere';
import {
  CategoryPath,
  CategoryPicker,
  emptyCategoryPath,
  useCategoryPathBack,
} from '../../src/components/CategoryPicker';
import { ThemeSwitcherButton } from '../../src/components/ThemeSwitcher';
import { HeaderRow } from '../../src/components/ui';
import {
  areRequiredDetailsFilled,
  getActivityDetailFields,
  summarizeActivityDetails,
} from '../../src/constants/activityDetails';
import { getSubCategory, platforms } from '../../src/constants/catalog';
import { fonts, radii, spacing } from '../../src/constants/theme';
import { useTheme } from '../../src/context/ThemeContext';

export default function CategoriesScreen() {
  const { colors } = useTheme();
  const [path, setPath] = useState<CategoryPath>(emptyCategoryPath());
  const onBack = useCategoryPathBack(path, setPath, '/(tabs)/home');

  const sub =
    path.universeId && path.subCategoryId
      ? getSubCategory(path.universeId, path.subCategoryId)
      : undefined;
  const platform = platforms.find((p) => p.id === path.platformId);
  const atDetailsStep = Boolean(sub);

  const detailFields = useMemo(() => {
    if (!path.universeId || !path.subCategoryId) return [];
    return getActivityDetailFields(path.universeId, path.subCategoryId);
  }, [path.universeId, path.subCategoryId]);

  const canSearch = Boolean(
    sub && areRequiredDetailsFilled(detailFields, path.activityDetails),
  );
  const summary = canSearch
    ? summarizeActivityDetails(detailFields, path.activityDetails)
    : '';

  return (
    <Atmosphere variant="soft">
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.top}>
          <Pressable
            style={[styles.back, { backgroundColor: colors.white, borderColor: colors.border }]}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <Ionicons name="arrow-back" size={20} color={colors.ink} />
          </Pressable>
          <ThemeSwitcherButton />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {!atDetailsStep ? (
            <HeaderRow
              title="Catégories"
              subtitle="Univers → activité → précisions"
            />
          ) : (
            <HeaderRow
              title="Presque prêt"
              subtitle="Quelques précisions pour affiner ton jumelo"
            />
          )}

          <View style={styles.picker}>
            <CategoryPicker value={path} onChange={setPath} requireDetails />
          </View>

          {canSearch ? (
            <Pressable
              style={[styles.cta, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/(tabs)/discover')}
            >
              <Text style={{ color: '#fff', fontFamily: fonts.bodyBold, textAlign: 'center' }}>
                Jumelo du jour
                {summary ? ` · ${summary}` : platform ? ` · ${platform.label}` : ''}
              </Text>
            </Pressable>
          ) : null}
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
  picker: {
    marginTop: spacing.lg,
  },
  cta: {
    marginTop: spacing.lg,
    borderRadius: radii.pill,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
});
