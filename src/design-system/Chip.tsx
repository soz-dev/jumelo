import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import { withHexAlpha } from '../constants/theme';
import { Icon, type IconName } from './Icon';
import { fonts, iconSizes, radii } from './tokens';

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** Icône catalogue (Simple Icons si mappé, sinon Phosphor). */
  name?: IconName;
  /** @deprecated Ne plus utiliser — préférer `name`. */
  emoji?: string;
  /** Alias de `name` pour migration. */
  icon?: IconName;
  /** Couleur marque Simple Icons quand disponible. */
  branded?: boolean;
  /**
   * `default` — fond soft / blanc.
   * `glass` — verre translucide (sur carte en dégradé thème).
   * `outline` — contour teinté primaryLight, fond blanc léger.
   */
  tone?: 'default' | 'glass' | 'outline';
};

export function Chip({
  label,
  selected,
  onPress,
  name,
  emoji,
  icon,
  branded,
  tone = 'default',
}: ChipProps) {
  const { colors } = useTheme();
  const iconName = name ?? icon;

  const surface =
    tone === 'glass'
      ? {
          backgroundColor: 'rgba(255,255,255,0.72)',
          borderColor: 'rgba(255,255,255,0.92)',
        }
      : tone === 'outline'
        ? {
            backgroundColor: 'rgba(255,255,255,0.55)',
            borderColor: withHexAlpha(colors.primaryLight, 0.85),
          }
        : {
            backgroundColor: selected ? withHexAlpha(colors.primaryLight, 0.35) : colors.white,
            borderColor: selected ? withHexAlpha(colors.primary, 0.45) : colors.border,
          };

  const tint =
    tone === 'glass' || tone === 'outline'
      ? colors.ink
      : selected
        ? colors.primary
        : colors.inkMuted;

  const labelColor =
    tone === 'glass' || tone === 'outline'
      ? colors.ink
      : selected
        ? colors.ink
        : colors.inkMuted;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.chip,
        surface,
        {
          opacity: pressed && onPress ? 0.9 : 1,
        },
      ]}
    >
      {iconName ? (
        <Icon
          name={iconName}
          size={iconSizes.xs}
          color={tint}
          weight="bold"
          branded={branded}
          style={{ marginRight: 6 }}
        />
      ) : emoji ? (
        <Text style={{ marginRight: 4 }}>{emoji}</Text>
      ) : null}
      <Text style={[styles.chipText, { color: labelColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.pill,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
});
