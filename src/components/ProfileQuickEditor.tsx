import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Level,
  UniverseId,
  Vibe,
  categories,
  findInterestInCatalog,
  getVibesForUniverses,
  interestCatalog,
  levels,
  objectives,
} from '../constants/catalog';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button, Chip, fonts, radii, spacing } from '../design-system';
import {
  MAX_PROFILE_VIBES,
  MIN_PROFILE_VIBES,
  toggleVibeSelection,
} from '../lib/vibes';
import { CategoryIcon } from './CategoryIcon';

export type ProfileQuickSection =
  | 'univers'
  | 'interests'
  | 'level'
  | 'vibes'
  | 'objectives';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Section mise en avant à l’ouverture */
  initialSection?: ProfileQuickSection;
};

const SECTION_LABELS: Record<ProfileQuickSection, string> = {
  univers: 'Univers',
  interests: 'Intérêts',
  level: 'Niveau',
  vibes: 'Vibes',
  objectives: 'Objectifs',
};

export function ProfileQuickEditor({
  visible,
  onClose,
  initialSection = 'univers',
}: Props) {
  const { colors } = useTheme();
  const { user, updateProfile } = useAuth();
  const insets = useSafeAreaInsets();

  const [section, setSection] = useState<ProfileQuickSection>(initialSection);
  const [universes, setUniverses] = useState<UniverseId[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [level, setLevel] = useState<Level>('intermediaire');
  const [vibes, setVibes] = useState<Vibe[]>([]);
  const [objectivesSel, setObjectivesSel] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!visible || !user) return;
    setSection(initialSection);
    setUniverses([...user.universes]);
    setInterests([...user.interests]);
    setLevel(user.level);
    setVibes([...user.vibes]);
    setObjectivesSel([...user.objectives]);
    setBusy(false);
    setError(undefined);
  }, [visible, user, initialSection]);

  const availableVibes = useMemo(
    () => getVibesForUniverses(universes),
    [universes],
  );

  useEffect(() => {
    if (!visible) return;
    const allowed = new Set(availableVibes.map((v) => v.id));
    setVibes((prev) => {
      const next = prev.filter((id) => allowed.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [availableVibes, visible]);

  const interestSections = useMemo(() => {
    const ids = universes.length
      ? universes
      : (Object.keys(interestCatalog) as UniverseId[]);
    return ids;
  }, [universes]);

  if (!user) return null;

  const toggleUniverse = (id: UniverseId) => {
    setUniverses((prev) => {
      const next = prev.includes(id)
        ? prev.filter((u) => u !== id)
        : [...prev, id];
      const allowedLabels = new Set(
        next.flatMap((u) => interestCatalog[u] ?? []),
      );
      setInterests((cur) => cur.filter((i) => allowedLabels.has(i)));
      return next;
    });
  };

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest],
    );
  };

  const toggleObjective = (objective: string) => {
    setObjectivesSel((prev) =>
      prev.includes(objective)
        ? prev.filter((o) => o !== objective)
        : [...prev, objective],
    );
  };

  const canSave =
    universes.length > 0 &&
    interests.length > 0 &&
    vibes.length >= MIN_PROFILE_VIBES &&
    objectivesSel.length > 0;

  const onSave = async () => {
    if (!canSave) {
      setError('Choisis au moins un univers, un intérêt, une vibe et un objectif.');
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const subCategoryIds = interests
        .map((label) => findInterestInCatalog(label)?.id)
        .filter((id): id is string => Boolean(id));
      await updateProfile({
        universes,
        interests,
        level,
        vibes,
        objectives: objectivesSel,
        subCategoryIds,
      });
      onClose();
    } catch {
      setError('Impossible d’enregistrer. Réessaie.');
    } finally {
      setBusy(false);
    }
  };

  const vibeCount = vibes.length;
  const atMaxVibes = vibeCount >= MAX_PROFILE_VIBES;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={busy ? undefined : onClose}
    >
      <Pressable style={styles.backdrop} onPress={busy ? undefined : onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: colors.cream,
              paddingBottom: Math.max(insets.bottom, spacing.lg),
              maxHeight: '88%',
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>
          <Text style={[styles.title, { color: colors.ink }]}>
            Édition rapide
          </Text>
          <Text style={[styles.sub, { color: colors.inkMuted }]}>
            Univers, intérêts, niveau, vibes et objectifs — sans repasser l’onboarding.
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabs}
          >
            {(Object.keys(SECTION_LABELS) as ProfileQuickSection[]).map((key) => {
              const selected = section === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setSection(key)}
                  style={[
                    styles.tab,
                    {
                      backgroundColor: selected
                        ? colors.primarySoft
                        : colors.white,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontFamily: fonts.bodyBold,
                      fontSize: 13,
                      color: selected ? colors.primaryDark : colors.inkMuted,
                    }}
                  >
                    {SECTION_LABELS[key]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {section === 'univers' ? (
              <View style={styles.list}>
                {categories.map((universe) => {
                  const selected = universes.includes(universe.id);
                  return (
                    <Pressable
                      key={universe.id}
                      onPress={() => toggleUniverse(universe.id)}
                      style={[
                        styles.card,
                        {
                          backgroundColor: selected
                            ? colors.primarySoft
                            : colors.white,
                          borderColor: selected
                            ? colors.primary
                            : colors.border,
                        },
                      ]}
                    >
                      <CategoryIcon universeId={universe.id} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cardLabel, { color: colors.ink }]}>
                          {universe.label}
                        </Text>
                        <Text
                          style={[styles.cardHint, { color: colors.inkMuted }]}
                        >
                          {universe.description}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {section === 'interests' ? (
              <>
                {interestSections.map((universeId) => (
                  <View key={universeId} style={styles.block}>
                    <Text style={[styles.blockTitle, { color: colors.inkMuted }]}>
                      {categories.find((c) => c.id === universeId)?.shortLabel ??
                        universeId}
                    </Text>
                    <View style={styles.wrap}>
                      {interestCatalog[universeId].map((interest) => (
                        <Chip
                          key={interest}
                          label={interest}
                          selected={interests.includes(interest)}
                          onPress={() => toggleInterest(interest)}
                        />
                      ))}
                    </View>
                  </View>
                ))}
                <View style={styles.block}>
                  <Text style={[styles.blockTitle, { color: colors.inkMuted }]}>
                    Niveau du jeu / activité
                  </Text>
                  <Text style={[styles.hintBar, { color: colors.inkMuted }]}>
                    {interests.length
                      ? `Pour : ${interests.slice(0, 3).join(', ')}${
                          interests.length > 3 ? ` +${interests.length - 3}` : ''
                        }`
                      : 'Choisis d’abord un intérêt, puis ton niveau.'}
                  </Text>
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
                </View>
              </>
            ) : null}

            {section === 'level' ? (
              <>
                <Text style={[styles.hintBar, { color: colors.inkMuted }]}>
                  {interests.length
                    ? `Niveau pour : ${interests.slice(0, 3).join(', ')}${
                        interests.length > 3 ? ` +${interests.length - 3}` : ''
                      }`
                    : 'Ton niveau sur le jeu ou l’activité choisi(e).'}
                </Text>
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
              </>
            ) : null}

            {section === 'vibes' ? (
              <>
                <Text style={[styles.hintBar, { color: colors.inkMuted }]}>
                  {vibeCount === 0
                    ? 'Choisis jusqu’à 3 vibes'
                    : atMaxVibes
                      ? `${vibeCount}/${MAX_PROFILE_VIBES} vibes — maximum`
                      : `${vibeCount}/${MAX_PROFILE_VIBES} vibes`}
                </Text>
                <View style={styles.wrap}>
                  {availableVibes.map((vibe) => {
                    const selected = vibes.includes(vibe.id);
                    const locked = atMaxVibes && !selected;
                    return (
                      <Chip
                        key={vibe.id}
                        name={vibe.icon}
                        label={vibe.label}
                        selected={selected}
                        onPress={
                          locked
                            ? undefined
                            : () =>
                                setVibes((prev) =>
                                  toggleVibeSelection(prev, vibe.id),
                                )
                        }
                      />
                    );
                  })}
                </View>
              </>
            ) : null}

            {section === 'objectives' ? (
              <View style={styles.wrap}>
                {objectives.map((item) => (
                  <Chip
                    key={item}
                    label={item}
                    selected={objectivesSel.includes(item)}
                    onPress={() => toggleObjective(item)}
                  />
                ))}
              </View>
            ) : null}
          </ScrollView>

          {error ? (
            <Text style={[styles.error, { color: colors.accent }]}>{error}</Text>
          ) : null}

          <Button
            label="Enregistrer"
            onPress={onSave}
            loading={busy}
            disabled={busy || !canSave}
            style={styles.save}
          />
          <Pressable onPress={onClose} disabled={busy} style={styles.cancel}>
            <Text style={{ fontFamily: fonts.bodyBold, color: colors.primary }}>
              Annuler
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(20,28,36,0.45)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  handleRow: { alignItems: 'center', marginBottom: spacing.sm },
  handle: { width: 40, height: 4, borderRadius: 2 },
  title: {
    fontFamily: fonts.displaySemi,
    fontSize: 22,
    letterSpacing: -0.3,
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 14,
    marginTop: 4,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  tabs: { gap: 8, paddingBottom: spacing.sm },
  tab: {
    borderRadius: radii.pill,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  body: { flexGrow: 0 },
  bodyContent: { paddingBottom: spacing.sm, minHeight: 180 },
  list: { gap: spacing.sm },
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1.5,
  },
  cardLabel: {
    fontFamily: fonts.displaySemi,
    fontSize: 17,
    letterSpacing: -0.3,
  },
  cardHint: {
    fontFamily: fonts.body,
    marginTop: 2,
    fontSize: 13,
  },
  block: { marginBottom: spacing.md },
  blockTitle: {
    fontFamily: fonts.bodyBold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    fontSize: 12,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  hintBar: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  error: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  save: { marginTop: spacing.sm },
  cancel: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
});
