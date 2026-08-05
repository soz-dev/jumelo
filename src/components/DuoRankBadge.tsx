import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import { fonts, radii, spacing, withHexAlpha } from '../design-system';
import type { DuoRankSnapshot } from '../lib/duoPoints';

type Size = 'sm' | 'md' | 'lg';

type Props = {
  rank: DuoRankSnapshot;
  size?: Size;
  /** Affiche la barre de niveau sous le badge. */
  showLevelBar?: boolean;
  /** Affiche le titre d’ambiance. */
  showTitle?: boolean;
};

const SIZE = {
  sm: { padH: 8, padV: 4, font: 11, level: 10, barH: 3 },
  md: { padH: 10, padV: 6, font: 13, level: 11, barH: 4 },
  lg: { padH: 12, padV: 8, font: 15, level: 12, barH: 5 },
} as const;

/** Pastille rang + niveau jumelo (style ranked). */
export function DuoRankBadge({
  rank,
  size = 'md',
  showLevelBar = false,
  showTitle = false,
}: Props) {
  const { colors } = useTheme();
  const s = SIZE[size];

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.badge,
          {
            backgroundColor: rank.colorSoft,
            borderColor: withHexAlpha(rank.color, 0.45),
            paddingHorizontal: s.padH,
            paddingVertical: s.padV,
          },
        ]}
      >
        <View style={[styles.dot, { backgroundColor: rank.color }]} />
        <Text
          style={[
            styles.rankText,
            { color: rank.color, fontSize: s.font },
          ]}
          numberOfLines={1}
        >
          {rank.displayName}
        </Text>
        <Text
          style={[
            styles.levelText,
            { color: withHexAlpha(rank.color, 0.85), fontSize: s.level },
          ]}
        >
          Nv.{rank.level}
        </Text>
      </View>

      {showTitle ? (
        <Text style={[styles.title, { color: colors.inkMuted }]} numberOfLines={1}>
          {rank.title}
        </Text>
      ) : null}

      {showLevelBar ? (
        <View style={styles.barBlock}>
          <View style={styles.barMeta}>
            <Text style={[styles.barLabel, { color: colors.inkFaint }]}>
              {rank.isMaxLevel
                ? 'Niveau max'
                : `Niveau ${rank.level} → ${rank.level + 1}`}
            </Text>
            <Text style={[styles.barLabel, { color: colors.inkFaint }]}>
              {rank.isMaxLevel
                ? `${rank.xp} XP`
                : `${rank.xpIntoLevel}/${rank.xpForNextLevel} XP`}
            </Text>
          </View>
          <View
            style={[
              styles.barTrack,
              {
                height: s.barH,
                backgroundColor: withHexAlpha(colors.ink, 0.08),
              },
            ]}
          >
            <View
              style={[
                styles.barFill,
                {
                  width: `${Math.round(rank.progressToNextLevel * 100)}%`,
                  backgroundColor: rank.color,
                  height: s.barH,
                },
              ]}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** Carte progression complète pour la fiche jumelo. */
export function DuoRankPanel({
  rank,
  sessionsEnded,
  averageRating,
  ratingCount,
}: {
  rank: DuoRankSnapshot;
  sessionsEnded: number;
  averageRating: number;
  ratingCount: number;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: colors.white,
          borderColor: withHexAlpha(rank.color, 0.35),
        },
      ]}
    >
      <View style={styles.panelTop}>
        <View style={[styles.rankOrb, { backgroundColor: rank.colorSoft }]}>
          <Text style={[styles.rankOrbLabel, { color: rank.color }]}>
            {rank.rankLabel.slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={styles.panelMeta}>
          <Text style={[styles.panelRank, { color: colors.ink }]}>
            {rank.displayName}
          </Text>
          <Text style={[styles.panelTitle, { color: rank.color }]}>{rank.title}</Text>
          <Text style={[styles.panelSub, { color: colors.inkMuted }]}>
            Niveau jumelo {rank.level}
            {rank.isMaxLevel ? ' · MAX' : ''} · {rank.xp} XP
          </Text>
        </View>
      </View>

      <View style={styles.barBlock}>
        <View style={styles.barMeta}>
          <Text style={[styles.barLabel, { color: colors.inkFaint }]}>
            {rank.isMaxLevel
              ? 'Niveau maximum atteint'
              : `Progression niv. ${rank.level}`}
          </Text>
          <Text style={[styles.barLabel, { color: colors.inkFaint }]}>
            {rank.isMaxLevel
              ? '—'
              : `${rank.xpIntoLevel} / ${rank.xpForNextLevel}`}
          </Text>
        </View>
        <View
          style={[
            styles.barTrack,
            { height: 6, backgroundColor: withHexAlpha(colors.ink, 0.08) },
          ]}
        >
          <View
            style={[
              styles.barFill,
              {
                width: `${Math.round(rank.progressToNextLevel * 100)}%`,
                backgroundColor: rank.color,
                height: 6,
              },
            ]}
          />
        </View>
      </View>

      {!rank.isMaxRank ? (
        <View style={styles.barBlock}>
          <View style={styles.barMeta}>
            <Text style={[styles.barLabel, { color: colors.inkFaint }]}>
              Vers le rang suivant
            </Text>
            <Text style={[styles.barLabel, { color: colors.inkFaint }]}>
              {Math.round(rank.progressInRank * 100)}%
            </Text>
          </View>
          <View
            style={[
              styles.barTrack,
              { height: 4, backgroundColor: withHexAlpha(colors.ink, 0.06) },
            ]}
          >
            <View
              style={[
                styles.barFill,
                {
                  width: `${Math.round(rank.progressInRank * 100)}%`,
                  backgroundColor: withHexAlpha(rank.color, 0.75),
                  height: 4,
                },
              ]}
            />
          </View>
        </View>
      ) : (
        <Text style={[styles.maxHint, { color: rank.color }]}>
          Rang Légendaire — le sommet du binôme
        </Text>
      )}

      <View style={styles.statsRow}>
        <Stat
          label="Sessions"
          value={String(sessionsEnded)}
          color={colors.ink}
          muted={colors.inkFaint}
        />
        <Stat
          label="Notes"
          value={ratingCount > 0 ? `${averageRating.toFixed(1)}★` : '—'}
          color={colors.ink}
          muted={colors.inkFaint}
        />
        <Stat
          label="XP"
          value={String(rank.xp)}
          color={colors.ink}
          muted={colors.inkFaint}
        />
      </View>
    </View>
  );
}

function Stat({
  label,
  value,
  color,
  muted,
}: {
  label: string;
  value: string;
  color: string;
  muted: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  rankText: {
    fontFamily: fonts.bodyBold,
    letterSpacing: -0.2,
  },
  levelText: {
    fontFamily: fonts.bodyMedium,
  },
  title: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  barBlock: { gap: 4 },
  barMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  barLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
  },
  barTrack: {
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  barFill: {
    borderRadius: radii.pill,
  },
  panel: {
    borderWidth: 1.5,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  panelTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rankOrb: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankOrbLabel: {
    fontFamily: fonts.displaySemi,
    fontSize: 16,
    letterSpacing: 0.5,
  },
  panelMeta: { flex: 1, gap: 2, minWidth: 0 },
  panelRank: {
    fontFamily: fonts.displaySemi,
    fontSize: 22,
    letterSpacing: -0.4,
  },
  panelTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  panelSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
  maxHint: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 4,
    gap: spacing.sm,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontFamily: fonts.displaySemi,
    fontSize: 16,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
  },
});
