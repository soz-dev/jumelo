import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { safeBack } from '../../src/lib/navigation';

import { Atmosphere } from '../../src/components/Atmosphere';
import { CategoryPath, CategoryPicker } from '../../src/components/CategoryPicker';
import { ThemeSwitcherButton } from '../../src/components/ThemeSwitcher';
import { Button, Chip } from '../../src/components/ui';
import {
  getSubCategory,
  getVibesForContext,
  levels,
  type Level,
  type Vibe,
} from '../../src/constants/catalog';
import { fonts, radii, spacing } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useTeams } from '../../src/context/TeamsContext';
import { useTheme } from '../../src/context/ThemeContext';
import { Icon, resolveCatalogIcon } from '../../src/design-system';

const CAPACITY_OPTIONS = [3, 4, 5, 6, 8, 10, 12];

export default function CreateTeamScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { create } = useTeams();

  const [path, setPath] = useState<CategoryPath>({
    universeId: null,
    subCategoryId: null,
    platformId: null,
  });
  const [name, setName] = useState('');
  const [activity, setActivity] = useState('');
  const [city, setCity] = useState(user?.city ?? 'Lyon');
  const [level, setLevel] = useState<Level>(user?.level ?? 'intermediaire');
  const [vibe, setVibe] = useState<Vibe | null>(user?.vibes?.[0] ?? 'fun');
  const [nextSession, setNextSession] = useState('');
  const [blurb, setBlurb] = useState('');
  const [capacity, setCapacity] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableVibes = useMemo(
    () =>
      path.universeId
        ? getVibesForContext(path.universeId, path.subCategoryId)
        : getVibesForContext('hobbies'),
    [path.universeId, path.subCategoryId],
  );

  const selectedSub = useMemo(() => {
    if (!path.universeId || !path.subCategoryId) return null;
    return getSubCategory(path.universeId, path.subCategoryId);
  }, [path.universeId, path.subCategoryId]);

  useEffect(() => {
    if (!vibe || !availableVibes.some((item) => item.id === vibe)) {
      setVibe(availableVibes[0]?.id ?? null);
    }
  }, [availableVibes, vibe]);

  useEffect(() => {
    if (!path.universeId || !path.subCategoryId) return;
    const sub = getSubCategory(path.universeId, path.subCategoryId);
    if (sub) setActivity((prev) => (prev.trim() ? prev : sub.label));
  }, [path.universeId, path.subCategoryId]);

  const canSubmit =
    !!user &&
    name.trim().length >= 2 &&
    !!path.universeId &&
    !!vibe &&
    !submitting;

  const onSubmit = async () => {
    if (!user || !path.universeId || !vibe) return;
    setError(null);
    setSubmitting(true);
    const levelLabel = levels.find((l) => l.id === level)?.label ?? 'Tous niveaux';
    const result = await create({
      name: name.trim(),
      universe: path.universeId,
      activity: activity.trim(),
      city: city.trim() || user.city || 'Lyon',
      levelLabel: levelLabel.toLowerCase(),
      vibe,
      nextSession: nextSession.trim(),
      blurb: blurb.trim(),
      capacity,
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      Alert.alert('Création impossible', result.error);
      return;
    }

    router.replace(`/team/${result.team.id}`);
  };

  return (
    <Atmosphere variant="bold">
      <SafeAreaView style={styles.safe} edges={['top']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.top}>
            <Pressable
              style={[
                styles.back,
                { backgroundColor: colors.white, borderColor: colors.border },
              ]}
              onPress={() => safeBack('/(tabs)/teams')}
            >
              <Ionicons name="arrow-back" size={20} color={colors.ink} />
            </Pressable>
            <ThemeSwitcherButton />
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.heroRow}>
              <View
                style={[
                  styles.icon,
                  {
                    backgroundColor:
                      path.universeId === 'gaming' ? '#0F8F8A' : colors.primary,
                  },
                ]}
              >
                <Icon
                  name={resolveCatalogIcon(
                    selectedSub?.id ?? path.universeId ?? 'teams',
                  )}
                  size={26}
                  color="#fff"
                  weight="bold"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.kicker, { color: colors.primaryDark }]}>
                  LOBBY · CRÉATION
                </Text>
                <Text style={[styles.title, { color: colors.ink }]}>Nouvelle équipe</Text>
              </View>
            </View>
            <Text style={[styles.sub, { color: colors.inkMuted }]}>
              Assemble ton squad — tu seras chef·fe et tu valides les demandes.
            </Text>

            <Text style={[styles.label, { color: colors.ink }]}>Nom de l’équipe *</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="ex: Valorant Squad Lyon"
              placeholderTextColor={colors.inkFaint}
              style={[
                styles.input,
                {
                  backgroundColor: colors.white,
                  borderColor: colors.border,
                  color: colors.ink,
                },
              ]}
              maxLength={40}
              autoCapitalize="words"
            />

            <Text style={[styles.label, { color: colors.ink }]}>Univers & jeu *</Text>
            <CategoryPicker value={path} onChange={setPath} />

            <Text style={[styles.label, { color: colors.ink }]}>Activité</Text>
            <TextInput
              value={activity}
              onChangeText={setActivity}
              placeholder="ex: Ranked soir, foot 5v5, jam funk…"
              placeholderTextColor={colors.inkFaint}
              style={[
                styles.input,
                {
                  backgroundColor: colors.white,
                  borderColor: colors.border,
                  color: colors.ink,
                },
              ]}
            />

            <Text style={[styles.label, { color: colors.ink }]}>Ville</Text>
            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder="Lyon"
              placeholderTextColor={colors.inkFaint}
              style={[
                styles.input,
                {
                  backgroundColor: colors.white,
                  borderColor: colors.border,
                  color: colors.ink,
                },
              ]}
            />

            <Text style={[styles.label, { color: colors.ink }]}>Niveau</Text>
            <View style={styles.wrap}>
              {levels.map((item) => (
                <Chip
                  key={item.id}
                  label={item.label}
                  selected={level === item.id}
                  onPress={() => setLevel(item.id)}
                />
              ))}
            </View>

            <Text style={[styles.label, { color: colors.ink }]}>Vibe *</Text>
            <View style={styles.wrap}>
              {availableVibes.map((item) => (
                <Chip
                  key={item.id}
                  name={item.icon}
                  label={item.label}
                  selected={vibe === item.id}
                  onPress={() => setVibe(item.id)}
                />
              ))}
            </View>

            <Text style={[styles.label, { color: colors.ink }]}>Slots (capacité)</Text>
            <View style={styles.wrap}>
              {CAPACITY_OPTIONS.map((n) => (
                <Chip
                  key={n}
                  label={`${n}`}
                  selected={capacity === n}
                  onPress={() => setCapacity(n)}
                />
              ))}
            </View>

            <Text style={[styles.label, { color: colors.ink }]}>Prochaine session</Text>
            <TextInput
              value={nextSession}
              onChangeText={setNextSession}
              placeholder="ex: Ce soir · 21h"
              placeholderTextColor={colors.inkFaint}
              style={[
                styles.input,
                {
                  backgroundColor: colors.white,
                  borderColor: colors.border,
                  color: colors.ink,
                },
              ]}
            />

            <Text style={[styles.label, { color: colors.ink }]}>Description</Text>
            <TextInput
              value={blurb}
              onChangeText={setBlurb}
              placeholder="Ambiance, rank, ce que tu cherches…"
              placeholderTextColor={colors.inkFaint}
              multiline
              style={[
                styles.input,
                styles.textarea,
                {
                  backgroundColor: colors.white,
                  borderColor: colors.border,
                  color: colors.ink,
                },
              ]}
            />

            {error ? (
              <Text style={[styles.error, { color: colors.accent }]}>{error}</Text>
            ) : null}

            <Button
              label="Lancer mon équipe"
              icon="rocket"
              onPress={onSubmit}
              disabled={!canSubmit}
              loading={submitting}
              style={{ marginTop: spacing.lg }}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
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
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.4,
    marginBottom: 2,
  },
  title: { fontFamily: fonts.display, fontSize: 32, letterSpacing: -0.8 },
  sub: { fontFamily: fonts.body, marginBottom: spacing.md, lineHeight: 22 },
  label: { fontFamily: fonts.bodyBold, marginTop: spacing.lg, marginBottom: spacing.sm },
  input: {
    borderWidth: 1.5,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontFamily: fonts.body,
    fontSize: 15,
  },
  textarea: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  error: { fontFamily: fonts.bodyMedium, marginTop: spacing.md, fontSize: 14 },
});
