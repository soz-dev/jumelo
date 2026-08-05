import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
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

import { Atmosphere } from '../../src/components/Atmosphere';
import {
  CategoryPath,
  CategoryPicker,
  emptyCategoryPath,
  useCategoryPathBack,
} from '../../src/components/CategoryPicker';
import { ActivityArtImage } from '../../src/components/ActivityArtImage';
import { GameArtImage } from '../../src/components/GameArtImage';
import { ThemeSwitcherButton } from '../../src/components/ThemeSwitcher';
import { Button, Chip } from '../../src/components/ui';
import {
  areRequiredDetailsFilled,
  getActivityDetailFields,
  isDetailValueFilled,
  platformFromDetails,
  type ActivityDetails,
} from '../../src/constants/activityDetails';
import {
  findCatalogInText,
  getCategory,
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
import type { Team } from '../../src/data/mock';
const NAME_MIN = 3;
const JUMELO_CAPACITY = 2;

function paramString(
  value: string | string[] | undefined,
): string | undefined {
  if (typeof value === 'string' && value.length > 0) return value;
  if (Array.isArray(value) && typeof value[0] === 'string' && value[0]) {
    return value[0];
  }
  return undefined;
}

function levelFromLabel(label: string | undefined): Level {
  if (!label) return 'intermediaire';
  const n = label.trim().toLowerCase();
  const byId = levels.find((l) => l.id === n);
  if (byId) return byId.id;
  const byLabel = levels.find((l) => l.label.toLowerCase() === n);
  if (byLabel) return byLabel.id;
  if (n.includes('début') || n.includes('debut')) return 'debutant';
  if (n.includes('avanc')) return 'avance';
  if (n.includes('pro') || n.includes('élite') || n.includes('elite')) return 'pro';
  return 'intermediaire';
}

function pathFromTeam(team: Team): CategoryPath {
  const match =
    (team.subCategoryId
      ? {
          id: team.subCategoryId,
          universeId: team.universe,
          label:
            getSubCategory(team.universe, team.subCategoryId)?.label ??
            team.activity,
        }
      : null) ?? findCatalogInText(`${team.name} ${team.activity}`, team.universe);
  const details = (team.activityDetails ?? {}) as ActivityDetails;
  return emptyCategoryPath({
    universeId: team.universe,
    subCategoryId: match?.id ?? team.subCategoryId ?? null,
    platformId: platformFromDetails(details),
    activityDetails: details,
  });
}

function missingRequiredLabels(args: {
  user: unknown;
  name: string;
  path: CategoryPath;
  vibe: Vibe | null;
  level: Level | null;
  city: string;
  locked: boolean | null;
}): string[] {
  const missing: string[] = [];
  if (!args.user) missing.push('Connexion');
  if (args.name.trim().length < NAME_MIN) {
    missing.push(`Nom (min. ${NAME_MIN} caractères)`);
  }
  if (!args.path.universeId) missing.push('Univers');
  if (!args.path.subCategoryId) missing.push('Activité / jeu');
  if (args.path.universeId && args.path.subCategoryId) {
    const fields = getActivityDetailFields(
      args.path.universeId,
      args.path.subCategoryId,
    );
    for (const field of fields.filter((f) => f.required)) {
      if (!isDetailValueFilled(args.path.activityDetails[field.id])) {
        missing.push(field.label);
      }
    }
  }
  if (!args.level) missing.push('Niveau');
  if (!args.vibe) missing.push('Vibe');
  if (!args.city.trim()) missing.push('Ville');
  if (args.locked === null || args.locked === undefined) {
    missing.push('Accès (verrouillé / ouvert)');
  }
  return missing;
}

export default function CreateTeamScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { create, update, teams, getMembership } = useTeams();
  const params = useLocalSearchParams<{ editId?: string }>();
  const editId = paramString(params.editId);
  const isEdit = !!editId;
  const editingTeam = useMemo(
    () => (editId ? teams.find((t) => t.id === editId) : undefined),
    [editId, teams],
  );

  const [path, setPath] = useState<CategoryPath>(emptyCategoryPath());
  const fallbackBack = isEdit && editId ? `/team/${editId}` : '/(tabs)/teams';
  const onBack = useCategoryPathBack(path, setPath, fallbackBack);
  const [name, setName] = useState('');
  const [activity, setActivity] = useState('');
  const [city, setCity] = useState(user?.city ?? 'Lyon');
  const [level, setLevel] = useState<Level | null>(user?.level ?? 'intermediaire');
  const [vibe, setVibe] = useState<Vibe | null>(user?.vibes?.[0] ?? 'fun');
  const [nextSession, setNextSession] = useState('');
  const [blurb, setBlurb] = useState('');
  const [locked, setLocked] = useState<boolean | null>(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hydratedEditId = useRef<string | null>(null);

  const availableVibes = useMemo(
    () =>
      path.universeId
        ? getVibesForContext(path.universeId, path.subCategoryId)
        : getVibesForContext('hobbies'),
    [path.universeId, path.subCategoryId],
  );

  const universeAccent = useMemo(
    () =>
      (path.universeId ? getCategory(path.universeId)?.color : undefined) ??
      colors.primary,
    [path.universeId, colors.primary],
  );

  const selectedSub = useMemo(() => {
    if (!path.universeId || !path.subCategoryId) return null;
    return getSubCategory(path.universeId, path.subCategoryId);
  }, [path.universeId, path.subCategoryId]);

  const detailFields = useMemo(() => {
    if (!path.universeId || !path.subCategoryId) return [];
    return getActivityDetailFields(path.universeId, path.subCategoryId);
  }, [path.universeId, path.subCategoryId]);

  useEffect(() => {
    if (!editId || !editingTeam) return;
    if (hydratedEditId.current === editId) return;
    if (getMembership(editId) !== 'owner') {
      Alert.alert('Accès refusé', 'Seul le chef peut modifier ce jumelo.');
      router.replace(`/team/${editId}`);
      return;
    }
    hydratedEditId.current = editId;
    setName(editingTeam.name);
    setActivity(editingTeam.activity);
    setCity(editingTeam.city || user?.city || 'Lyon');
    setLevel(levelFromLabel(editingTeam.levelLabel));
    setVibe((editingTeam.vibe as Vibe) || null);
    setNextSession(editingTeam.nextSession === 'À définir' ? '' : editingTeam.nextSession);
    setBlurb(editingTeam.blurb);
    setLocked(editingTeam.locked);
    setPath(pathFromTeam(editingTeam));
  }, [editId, editingTeam, getMembership, user?.city]);

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

  const missing = useMemo(
    () =>
      missingRequiredLabels({
        user,
        name,
        path,
        vibe,
        level,
        city,
        locked,
      }),
    [user, name, path, vibe, level, city, locked],
  );

  const detailsOk =
    !path.universeId ||
    !path.subCategoryId ||
    areRequiredDetailsFilled(detailFields, path.activityDetails);

  const canSubmit =
    !!user &&
    missing.length === 0 &&
    detailsOk &&
    !submitting &&
    (!isEdit || !!editingTeam);

  const buildPayload = () => {
    const levelLabel =
      levels.find((l) => l.id === level)?.label ?? 'Tous niveaux';
    const activityLabel =
      activity.trim() || selectedSub?.label || name.trim();
    return {
      name: name.trim(),
      universe: path.universeId!,
      activity: activityLabel,
      subCategoryId: path.subCategoryId,
      activityDetails: path.activityDetails,
      city: city.trim() || user?.city || 'Lyon',
      levelLabel: levelLabel.toLowerCase(),
      vibe: vibe!,
      nextSession: nextSession.trim(),
      blurb: blurb.trim(),
      capacity: JUMELO_CAPACITY,
      locked: locked !== false,
    };
  };

  const onSubmit = async () => {
    if (!canSubmit) {
      const list = missing.length
        ? missing.map((m) => `• ${m}`).join('\n')
        : 'Complète les champs obligatoires.';
      Alert.alert('Formulaire incomplet', list);
      setError(`Manque : ${missing.join(', ')}`);
      return;
    }
    if (!user || !path.universeId || !path.subCategoryId || !vibe || !level) {
      return;
    }
    setError(null);
    setSubmitting(true);
    const payload = buildPayload();

    const result = isEdit && editId
      ? await update(editId, payload)
      : await create(payload);

    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      Alert.alert(isEdit ? 'Enregistrement impossible' : 'Création impossible', result.error);
      return;
    }

    router.replace(`/team/${result.team.id}`);
  };

  if (isEdit && editId && !editingTeam) {
    return (
      <Atmosphere variant="bold">
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.top}>
            <Pressable
              style={[
                styles.back,
                { backgroundColor: colors.white, borderColor: colors.border },
              ]}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Retour"
            >
              <Ionicons name="arrow-back" size={20} color={colors.ink} />
            </Pressable>
            <ThemeSwitcherButton />
          </View>
          <Text style={[styles.sub, { color: colors.inkMuted, padding: spacing.lg }]}>
            Chargement de l’équipe…
          </Text>
        </SafeAreaView>
      </Atmosphere>
    );
  }

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
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel="Retour"
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
              {path.universeId === 'gaming' && selectedSub?.id ? (
                <GameArtImage
                  catalogId={selectedSub.id}
                  size={40}
                  color={colors.primary}
                  brandedFallback
                />
              ) : selectedSub?.id ? (
                <ActivityArtImage
                  catalogId={selectedSub.id}
                  size={40}
                  color={colors.primary}
                  backgroundColor="#F0F4F6"
                />
              ) : (
                <Icon
                  name={resolveCatalogIcon(path.universeId ?? 'teams')}
                  size={32}
                  color={colors.primary}
                  weight="bold"
                />
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.kicker, { color: colors.primaryDark }]}>
                  {isEdit ? 'JUMELO · ÉDITION' : 'JUMELO · CRÉATION'}
                </Text>
                <Text style={[styles.title, { color: colors.ink }]}>
                  {isEdit ? 'Modifier le jumelo' : 'Nouveau jumelo'}
                </Text>
              </View>
            </View>
            <Text style={[styles.sub, { color: colors.inkMuted }]}>
              {isEdit
                ? 'Même formulaire que la création — enregistre pour mettre à jour le lobby.'
                : 'Une activité, deux personnes. Tu seras chef·fe du jumelo.'}
            </Text>

            <Text style={[styles.label, { color: colors.ink }]}>Nom du jumelo *</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="ex: Jumelo Ranked Lyon"
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

            <Text style={[styles.label, { color: colors.ink }]}>Univers & activité *</Text>
            <CategoryPicker value={path} onChange={setPath} requireDetails />

            <Text style={[styles.label, { color: colors.ink }]}>Libellé activité</Text>
            <TextInput
              value={activity}
              onChangeText={setActivity}
              placeholder="ex: Ranked jumelo, muscu, jam funk…"
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

            <Text style={[styles.label, { color: colors.ink }]}>Ville *</Text>
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

            <Text style={[styles.label, { color: colors.ink }]}>Niveau *</Text>
            <View style={styles.wrap}>
              {levels.map((item) => (
                <Chip
                  key={item.id}
                  label={item.label}
                  accent={universeAccent}
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
                  accent={universeAccent}
                  selected={vibe === item.id}
                  onPress={() => setVibe(item.id)}
                />
              ))}
            </View>

            <Text style={[styles.label, { color: colors.ink }]}>Slots *</Text>
            <View style={styles.wrap}>
              <Chip label="2 personnes" accent={universeAccent} selected />
            </View>

            <Text style={[styles.label, { color: colors.ink }]}>Accès *</Text>
            <View style={styles.wrap}>
              <Chip
                label="Verrouillé · demandes"
                accent={universeAccent}
                selected={locked === true}
                onPress={() => setLocked(true)}
              />
              <Chip
                label="Ouvert · entrée libre"
                accent={universeAccent}
                selected={locked === false}
                onPress={() => setLocked(false)}
              />
            </View>
            <Text style={[styles.hint, { color: colors.inkFaint }]}>
              {locked
                ? 'Les joueurs demandent à rejoindre — tu Approuves / Refuses.'
                : 'N’importe qui peut rejoindre directement, sans validation.'}
            </Text>

            <Text style={[styles.label, { color: colors.ink }]}>Prochaine session</Text>
            <TextInput
              value={nextSession}
              onChangeText={setNextSession}
              placeholder="ex: Demain · 21h"
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
              placeholder="Ambiance, niveau, ce que tu cherches…"
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

            {!canSubmit && missing.length > 0 ? (
              <Text style={[styles.hint, { color: colors.accent, marginTop: spacing.md }]}>
                À compléter : {missing.join(' · ')}
              </Text>
            ) : null}

            <Button
              label={isEdit ? 'Enregistrer' : 'Lancer mon jumelo'}
              icon={isEdit ? 'checkmark' : 'rocket'}
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
  hint: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, marginTop: 6 },
  error: { fontFamily: fonts.bodyMedium, marginTop: spacing.md, fontSize: 14 },
});
