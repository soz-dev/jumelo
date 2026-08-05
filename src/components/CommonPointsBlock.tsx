import { StyleSheet, Text, View } from 'react-native';

import { Chip, ScoreBadge } from './ui';
import { Icon, ListRow, SectionHeader, type IconName } from '../design-system';
import { fonts, spacing } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import type { CommonPoint } from '../lib/commonPoints';
import {
  isOfficialJumelage,
  MATCH_THRESHOLD,
  scoreLabel,
  type MatchReason,
} from '../lib/matching';

const KIND_ICON: Record<CommonPoint['kind'], IconName> = {
  universe: 'spark',
  interest: 'interest',
  platform: 'online',
  vibe: 'vibe',
  city: 'city',
  availability: 'soir',
  age: 'pulse',
};

type Props = {
  points: CommonPoint[];
  /** Score de match déjà calculé — affiché en pourcentage. */
  score?: number;
  /** Raisons du score (intérêts, dispos, vibe…) — le « pourquoi ». */
  reasons?: MatchReason[];
  /** Variante compacte (sheet like / cartes). */
  compact?: boolean;
  /** Masquer le bloc si l’utilisateur regarde son propre profil. */
  hidden?: boolean;
};

export function CommonPointsBlock({
  points,
  score,
  reasons,
  compact,
  hidden,
}: Props) {
  const { colors } = useTheme();

  if (hidden) return null;

  const topReasons = (reasons ?? [])
    .filter((r) => r.points > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, compact ? 3 : 4);

  const jumelageReady =
    typeof score === 'number' ? isOfficialJumelage(score) : false;

  const subtitle =
    typeof score === 'number'
      ? jumelageReady
        ? `${scoreLabel(score)} · ${score}% (≥ ${MATCH_THRESHOLD}% pour jumeler)`
        : `${score}% — ${MATCH_THRESHOLD}% minimum pour jumeler`
      : 'Ce qui vous rapproche vraiment';

  return (
    <View style={[styles.root, compact && styles.rootCompact]}>
      <SectionHeader
        title="Pourquoi ce jumelage"
        subtitle={subtitle}
        right={typeof score === 'number' ? <ScoreBadge score={score} /> : undefined}
      />

      {topReasons.length > 0 ? (
        <View style={styles.reasons}>
          {topReasons.map((reason) => (
            <ListRow
              key={reason.key}
              title={reason.label}
              subtitle={reason.detail}
              chevron={false}
              left={
                <View style={[styles.reasonDot, { backgroundColor: colors.primary }]} />
              }
              right={
                <Text style={[styles.reasonPts, { color: colors.primary }]}>
                  {Math.round((reason.similarity ?? reason.points / Math.max(reason.max, 1)) * 100)}%
                </Text>
              }
            />
          ))}
        </View>
      ) : null}

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
              name={point.icon ?? KIND_ICON[point.kind]}
              tone="outline"
            />
          ))}
        </View>
      )}

      {typeof score === 'number' && !jumelageReady ? (
        <View style={[styles.thresholdHint, { backgroundColor: colors.white, borderColor: colors.border }]}>
          <Icon name="spark" size={16} color={colors.inkMuted} />
          <Text style={[styles.thresholdText, { color: colors.inkMuted }]}>
            Jumelage possible dès {MATCH_THRESHOLD}% de points communs.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginTop: spacing.md,
    alignSelf: 'stretch',
  },
  rootCompact: {
    marginTop: spacing.sm,
  },
  reasons: {
    marginBottom: spacing.xs,
  },
  reasonDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  reasonPts: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
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
  thresholdHint: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  thresholdText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
});
