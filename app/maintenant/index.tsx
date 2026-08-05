import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  CategoryPath,
  CategoryPicker,
  emptyCategoryPath,
  useCategoryPathBack,
} from '../../src/components/CategoryPicker';
import { ThemeSwitcherButton } from '../../src/components/ThemeSwitcher';
import { Button, Chip } from '../../src/components/ui';
import {
  getCategory,
  getVibesForContext,
  type Vibe,
} from '../../src/constants/catalog';
import { fonts, radii, spacing, withHexAlpha } from '../../src/constants/theme';
import { useTheme } from '../../src/context/ThemeContext';

export default function MaintenantScreen() {
  const { colors } = useTheme();
  const [path, setPath] = useState<CategoryPath>(
    emptyCategoryPath({ universeId: 'gaming' }),
  );
  const onBack = useCategoryPathBack(path, setPath, '/(tabs)/home');
  const [activity, setActivity] = useState('');
  const [vibe, setVibe] = useState<Vibe | null>('fun');

  const availableVibes = useMemo(
    () => getVibesForContext(path.universeId ?? 'gaming', path.subCategoryId),
    [path.universeId, path.subCategoryId],
  );

  const universeAccent = useMemo(
    () =>
      (path.universeId ? getCategory(path.universeId)?.color : undefined) ??
      colors.primary,
    [path.universeId, colors.primary],
  );

  useEffect(() => {
    if (!vibe || !availableVibes.some((item) => item.id === vibe)) {
      setVibe(availableVibes[0]?.id ?? null);
    }
  }, [availableVibes, vibe]);

  const canSearch = !!path.universeId;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.cream }]}>
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
        <View
          style={[
            styles.icon,
            {
              backgroundColor: withHexAlpha(universeAccent, 0.14),
              borderColor: withHexAlpha(universeAccent, 0.28),
            },
          ]}
        >
          <Ionicons name="flash" size={28} color={universeAccent} />
        </View>
        <Text style={[styles.title, { color: colors.ink }]}>Jumelo maintenant</Text>
        <Text style={[styles.sub, { color: colors.inkMuted }]}>
          Jumelage 1:1 — trouve un partenaire dispo tout de suite (slots 2/2)
        </Text>

        <Text style={[styles.label, { color: colors.ink }]}>Univers</Text>
        <CategoryPicker value={path} onChange={setPath} />

        <Text style={[styles.label, { color: colors.ink }]}>Activité (optionnel)</Text>
        <TextInput
          value={activity}
          onChangeText={setActivity}
          placeholder="ex: Valorant ranked, muscu, jam guitare..."
          placeholderTextColor={colors.inkFaint}
          style={[
            styles.input,
            { backgroundColor: colors.white, borderColor: colors.border, color: colors.ink },
          ]}
        />

        <Text style={[styles.label, { color: colors.ink }]}>Vibe recherchée</Text>
        <View style={styles.wrap}>
          {availableVibes.map((item) => (
            <Chip
              key={item.id}
              name={item.icon}
              label={item.label}
              accent={universeAccent}
              selected={vibe === item.id}
              onPress={() => setVibe(item.id)}
            />
          ))}
        </View>

        <Button
          label="Trouver mon jumelo"
          icon="flash"
          onPress={() =>
            router.push({
              pathname: '/maintenant/searching',
              params: {
                universe: path.universeId ?? '',
                sub: path.subCategoryId ?? '',
                platform: path.platformId ?? '',
                details: JSON.stringify(path.activityDetails),
                activity,
                vibe: vibe ?? '',
              },
            })
          }
          disabled={!canSearch}
          style={{ marginTop: spacing.lg }}
        />
        <View style={styles.onlineRow}>
          <View style={[styles.onlineDot, { backgroundColor: colors.accent }]} />
          <Text style={{ color: colors.inkMuted, fontFamily: fonts.body }}>
            Partenaires en ligne pour un jumelo maintenant
          </Text>
        </View>
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
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: { fontFamily: fonts.display, fontSize: 32 },
  sub: { fontFamily: fonts.body, marginTop: 4, marginBottom: spacing.lg },
  label: { fontFamily: fonts.bodyBold, marginTop: spacing.lg, marginBottom: spacing.sm },
  input: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontFamily: fonts.body,
    fontSize: 15,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.md,
  },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
});
