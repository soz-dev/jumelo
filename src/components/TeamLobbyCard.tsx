import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { CategoryIcon } from './CategoryIcon';
import { getCategory } from '../constants/catalog';
import type { Team } from '../data/mock';
import { useTheme } from '../context/ThemeContext';
import {
  Icon,
  elevation,
  fonts,
  radii,
  spacing,
  typography,
  withHexAlpha,
} from '../design-system';
import type { TeamMembershipState } from '../lib/api/teams';

export function joinLabel(state: TeamMembershipState, locked: boolean): string {
  switch (state) {
    case 'owner':
      return 'Gérer';
    case 'member':
      return 'Chat groupe';
    case 'pending':
      return 'En attente';
    case 'rejected':
      return locked ? 'Redemander' : 'Rejoindre';
    default:
      return locked ? 'Demander' : 'Rejoindre';
  }
}

type Props = {
  team: Team;
  state: TeamMembershipState;
  busy: boolean;
  onJoin: () => void;
  onDetails: () => void;
};

export function TeamLobbyCard({ team, state, busy, onJoin, onDetails }: Props) {
  const { colors } = useTheme();
  const cat = getCategory(team.universe);
  const accent = cat?.color ?? colors.primary;
  const progress = team.membersCount / team.capacity;
  const label = joinLabel(state, team.locked);
  const joinDisabled = state === 'pending' || busy;
  const joinBg =
    state === 'pending'
      ? colors.inkFaint
      : state === 'member' || state === 'owner'
        ? colors.primarySoft
        : colors.primary;
  const joinTextColor =
    state === 'member' || state === 'owner' ? colors.primaryDark : '#fff';

  const washTop = withHexAlpha(accent, team.locked ? 0.07 : 0.14);
  const washEnd = withHexAlpha(accent, team.locked ? 0.02 : 0.04);
  const borderColor = team.locked
    ? withHexAlpha(accent, 0.22)
    : withHexAlpha(accent, 0.48);
  const accessBg = team.locked
    ? withHexAlpha(colors.ink, 0.08)
    : withHexAlpha(colors.success, 0.14);
  const accessFg = team.locked ? colors.inkMuted : colors.success;

  return (
    <View style={[styles.cardShell, elevation.soft]}>
      <View
        style={[
          styles.card,
          {
            borderColor,
            borderWidth: team.locked ? 1 : 1.5,
          },
        ]}
      >
      <LinearGradient
        colors={[washTop, washEnd, colors.white]}
        locations={[0, 0.45, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.sideAccent, { backgroundColor: accent }]} />
      <View style={[styles.topBar, { backgroundColor: accent }]} />

      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <View>
            <CategoryIcon universeId={team.universe} size={44} />
            <View
              style={[
                styles.lockGlyph,
                {
                  backgroundColor: team.locked ? colors.ink : colors.success,
                  borderColor: colors.white,
                },
              ]}
            >
              <Icon
                name={team.locked ? 'lock' : 'lock-open'}
                size={10}
                color="#fff"
                weight="bold"
              />
            </View>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: colors.ink }]} numberOfLines={1}>
              {team.name}
            </Text>
            <Text
              style={{ color: colors.inkMuted, fontFamily: fonts.body, fontSize: 14 }}
              numberOfLines={1}
            >
              {team.activity}
            </Text>
            <View style={styles.tagRow}>
              <View style={[styles.catTag, { backgroundColor: withHexAlpha(accent, 0.16) }]}>
                <Icon name={team.universe} size={11} color={accent} weight="bold" />
                <Text style={[styles.catTagText, { color: accent }]}>
                  {cat?.shortLabel ?? team.universe}
                </Text>
              </View>
              <View style={[styles.accessBadge, { backgroundColor: accessBg }]}>
                <Icon
                  name={team.locked ? 'lock' : 'lock-open'}
                  size={11}
                  color={accessFg}
                  weight="bold"
                />
                <Text style={[styles.accessText, { color: accessFg }]}>
                  {team.locked ? 'Sur demande' : 'Entrée libre'}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.vibe, { backgroundColor: withHexAlpha(accent, 0.14) }]}>
            <Text style={{ color: accent, fontFamily: fonts.bodyMedium, fontSize: 12 }}>
              {team.vibe}
            </Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Icon name="city" size={14} color={colors.inkMuted} />
          <Text style={[styles.meta, { color: colors.inkMuted }]}>{team.city}</Text>
          <Icon name="teams" size={14} color={colors.inkMuted} />
          <Text style={[styles.meta, { color: colors.inkMuted }]}>
            {team.membersCount}/{team.capacity}
          </Text>
          <Text style={[styles.meta, { color: colors.inkMuted }]}>
            · Niveau: {team.levelLabel}
          </Text>
        </View>

        {state === 'pending' ? (
          <View style={[styles.pendingBanner, { backgroundColor: colors.primarySoft }]}>
            <Icon name="flexible" size={16} color={colors.primaryDark} />
            <Text
              style={{
                color: colors.primaryDark,
                fontFamily: fonts.bodyMedium,
                fontSize: 13,
                flex: 1,
              }}
            >
              En attente d’approbation
            </Text>
          </View>
        ) : null}

        <View style={[styles.progressTrack, { backgroundColor: withHexAlpha(accent, 0.15) }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(progress, 1) * 100}%`,
                backgroundColor: accent,
              },
            ]}
          />
        </View>

        <View style={styles.rowBtns}>
          <Pressable
            style={[
              styles.join,
              { backgroundColor: joinBg },
              state !== 'pending' && state !== 'member' && state !== 'owner'
                ? elevation.glow(joinBg)
                : null,
            ]}
            disabled={joinDisabled && state === 'pending'}
            onPress={onJoin}
          >
            {busy ? (
              <ActivityIndicator color={joinTextColor} />
            ) : (
              <Text style={[styles.joinText, { color: joinTextColor }]}>{label}</Text>
            )}
          </Pressable>
          <Pressable
            style={[
              styles.details,
              {
                borderColor: withHexAlpha(accent, 0.35),
                backgroundColor: withHexAlpha(colors.white, 0.55),
              },
            ]}
            onPress={onDetails}
          >
            <Text style={{ color: colors.ink, fontFamily: fonts.bodyMedium }}>Détails</Text>
          </Pressable>
        </View>
      </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardShell: {
    borderRadius: radii.xl,
    marginBottom: spacing.md,
  },
  card: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  sideAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    zIndex: 1,
  },
  topBar: { height: 4 },
  cardBody: { padding: spacing.md, paddingLeft: spacing.md + 4 },
  cardTop: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  name: { ...typography.section, fontSize: 17, letterSpacing: -0.3 },
  lockGlyph: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  catTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  catTagText: { fontFamily: fonts.bodyBold, fontSize: 11 },
  accessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  accessText: { fontFamily: fonts.bodyMedium, fontSize: 11 },
  vibe: {
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: spacing.md,
  },
  meta: { fontFamily: fonts.body, fontSize: 13 },
  pendingBanner: {
    marginTop: spacing.sm,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: { height: '100%' },
  rowBtns: { flexDirection: 'row', gap: 10, marginTop: spacing.md },
  join: {
    flex: 1,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    minHeight: 48,
  },
  joinText: { fontFamily: fonts.bodyBold, fontSize: 15, letterSpacing: 0.1 },
  details: {
    borderWidth: 1.5,
    borderRadius: radii.pill,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
});
