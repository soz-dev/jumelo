import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { findInterestInCatalog, getCategory } from '../constants/catalog';
import { withHexAlpha } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import {
  Icon,
  elevation,
  fonts,
  radii,
  resolveCatalogIcon,
  spacing,
} from '../design-system';
import { ActivityArtImage } from './ActivityArtImage';
import { GameArtImage } from './GameArtImage';

const ICON_SIZE = 44;

type Props = {
  interest: string;
  levelLabel?: string;
};

/**
 * Tuile intérêt profil : jaquette jeu (gaming) ou Twemoji coloré (autres univers).
 */
export function InterestTile({ interest, levelLabel }: Props) {
  const { colors } = useTheme();
  const match = findInterestInCatalog(interest);
  const catalogId = match?.id;
  const label = match?.label ?? interest;
  const universeId = match?.universeId;
  const universeColor =
    (universeId ? getCategory(universeId)?.color : undefined) ?? colors.primary;
  const isGaming = universeId === 'gaming';

  return (
    <View
      style={[
        styles.tile,
        elevation.soft,
        {
          backgroundColor: colors.white,
          borderColor: withHexAlpha(universeColor, 0.22),
        },
      ]}
    >
      {isGaming && catalogId ? (
        <GameArtImage
          catalogId={catalogId}
          size={ICON_SIZE}
          color={universeColor}
          brandedFallback
        />
      ) : catalogId ? (
        <ActivityArtImage
          catalogId={catalogId}
          size={ICON_SIZE}
          color={universeColor}
          backgroundColor="#F0F4F6"
        />
      ) : (
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: withHexAlpha(universeColor, 0.14) },
          ]}
        >
          <Icon
            name={resolveCatalogIcon('interest')}
            size={22}
            color={universeColor}
            weight="bold"
          />
        </View>
      )}

      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.ink }]} numberOfLines={1}>
          {label}
        </Text>
        {universeId ? (
          <Text style={[styles.meta, { color: colors.inkMuted }]} numberOfLines={1}>
            {getCategory(universeId)?.shortLabel ?? universeId}
          </Text>
        ) : null}
      </View>

      {levelLabel ? (
        <View
          style={[
            styles.levelPill,
            {
              backgroundColor: withHexAlpha(universeColor, 0.12),
              borderColor: withHexAlpha(universeColor, 0.28),
            },
          ]}
        >
          <Text style={[styles.levelText, { color: universeColor }]}>
            {levelLabel}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.smd,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    marginBottom: spacing.sm,
  },
  iconWrap: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: Math.round(ICON_SIZE * 0.28),
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    letterSpacing: -0.2,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 12,
  },
  levelPill: {
    borderRadius: radii.pill,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderWidth: 1,
  },
  levelText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    textTransform: 'capitalize',
  },
});
