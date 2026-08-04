import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Chip, ScoreBadge } from './ui';
import { fonts, radii, spacing } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import type { CommonPoint } from '../lib/commonPoints';

const KIND_ICON: Record<CommonPoint['kind'], keyof typeof Ionicons.glyphMap> = {
  universe: 'planet-outline',
  interest: 'sparkles-outline',
  platform: 'hardware-chip-outline',
  vibe: 'happy-outline',
  city: 'location-outline',
  availability: 'time-outline',
};

type Props = {
  points: CommonPoint[];
  /** Score de match déjà calculé — affiché à côté du titre. */
  score?: number;
  /** Variante compacte (sheet like / cartes). */
  compact?: boolean;
  /** Masquer le bloc si l’utilisateur regarde son propre profil. */
  hidden?: boolean;
};

export function CommonPointsBlock({ points, score, compact, hidden }: Props) {
  const { colors } = useTheme();

  if (hidden) return null;

  return (
    <View
      style={[
        styles.card,
        compact && styles.cardCompact,
        {
          backgroundColor: colors.primarySoft,
          borderColor: colors.primary,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="git-compare-outline" size={compact ? 18 : 20} color={colors.primary} />
          <Text
            style={[
              styles.title,
              compact && styles.titleCompact,
              { color: colors.primaryDark },
            ]}
          >
            Vos points communs
          </Text>
        </View>
        {typeof score === 'number' ? <ScoreBadge score={score} /> : null}
      </View>

      {points.length === 0 ? (
        <Text style={[styles.empty, { color: colors.inkMuted }]}>
          Pas encore de point commun évident — explorez quand même le profil.
        </Text>
      ) : (
        <View style={styles.wrap}>
          {points.map((point) => (
            <Chip
              key={point.key}
              label={point.label}
              emoji={point.emoji}
              icon={point.emoji ? undefined : KIND_ICON[point.kind]}
              selected
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
    borderWidth: 1.5,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  cardCompact: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    alignSelf: 'stretch',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 20,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  titleCompact: {
    fontSize: 16,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  empty: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
});
