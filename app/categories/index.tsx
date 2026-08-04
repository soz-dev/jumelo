import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Atmosphere } from '../../src/components/Atmosphere';
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
  const atPlatformStep = Boolean(sub);
  const canSearch = Boolean(sub && (!sub.platforms?.length || platform));

  return (
    <Atmosphere variant="soft">
      <SafeAreaView style={styles.safe} edges={['top']}>
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
          {!atPlatformStep ? (
            <HeaderRow
              title="Catégories"
              subtitle="Univers → activité → plateforme"
            />
          ) : (
            <HeaderRow
              title="Presque prêt"
              subtitle="Choisis ta plateforme pour lancer la recherche"
            />
          )}

          <View style={styles.picker}>
            <CategoryPicker value={path} onChange={setPath} requirePlatform />
          </View>

          {canSearch ? (
            <Pressable
              style={[styles.cta, { backgroundColor: colors.primary }]}
              onPress={() =>
                router.push({
                  pathname: '/maintenant',
                  params: {
                    universe: path.universeId ?? '',
                    activity: sub?.label ?? '',
                    platform: platform?.id ?? '',
                  },
                })
              }
            >
              <Text style={{ color: '#fff', fontFamily: fonts.bodyBold, textAlign: 'center' }}>
                Chercher un partenaire
                {platform ? ` · ${platform.label}` : ''}
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
