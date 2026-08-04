import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  CategoryPath,
  CategoryPicker,
} from '../../src/components/CategoryPicker';
import { ThemeSwitcherButton } from '../../src/components/ThemeSwitcher';
import { HeaderRow } from '../../src/components/ui';
import { getCategory, getSubCategory, platforms } from '../../src/constants/catalog';
import { fonts, radii, spacing } from '../../src/constants/theme';
import { useTheme } from '../../src/context/ThemeContext';
import { safeBack } from '../../src/lib/navigation';

export default function CategoriesScreen() {
  const { colors } = useTheme();
  const [path, setPath] = useState<CategoryPath>({
    universeId: null,
    subCategoryId: null,
    platformId: null,
  });

  const cat = path.universeId ? getCategory(path.universeId) : undefined;
  const sub =
    path.universeId && path.subCategoryId
      ? getSubCategory(path.universeId, path.subCategoryId)
      : undefined;
  const platform = platforms.find((p) => p.id === path.platformId);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.cream }]}>
      <View style={styles.top}>
        <Pressable
          style={[styles.back, { backgroundColor: colors.white, borderColor: colors.border }]}
          onPress={() => safeBack('/(tabs)/home')}
        >
          <Ionicons name="arrow-back" size={20} color={colors.ink} />
        </Pressable>
        <ThemeSwitcherButton />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <HeaderRow
          title="Catégories"
          subtitle="Univers → activité → plateforme"
        />

        <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.border }]}>
          <CategoryPicker value={path} onChange={setPath} requirePlatform />
        </View>

        {(cat || sub || platform) && (
          <View style={[styles.summary, { backgroundColor: colors.primarySoft }]}>
            <Text style={[styles.summaryTitle, { color: colors.primaryDark }]}>
              Sélection
            </Text>
            <Text style={{ color: colors.ink, fontFamily: fonts.body }}>
              {[cat?.label, sub?.label, platform?.label].filter(Boolean).join(' › ')}
            </Text>
            <Pressable
              style={[styles.cta, { backgroundColor: colors.primary }]}
              onPress={() =>
                router.push({
                  pathname: '/maintenant',
                  params: {
                    // prefill via navigation only — Maintenant has its own state
                  },
                })
              }
            >
              <Text style={{ color: '#fff', fontFamily: fonts.bodyBold }}>
                Chercher un partenaire dans cette catégorie
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
  content: { padding: spacing.lg },
  card: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  summary: {
    marginTop: spacing.lg,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  summaryTitle: { fontFamily: fonts.bodyBold },
  cta: {
    marginTop: spacing.sm,
    borderRadius: radii.pill,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
});
