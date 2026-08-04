import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '../context/ThemeContext';
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
};

export function Chip({
  label,
  selected,
  onPress,
  name,
  emoji,
  icon,
  branded,
}: ChipProps) {
  const { colors } = useTheme();
  const iconName = name ?? icon;
  const tint = selected ? colors.primaryDark : colors.inkMuted;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? colors.primarySoft : colors.white,
          borderColor: selected ? colors.primary : colors.border,
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
      <Text
        style={[
          styles.chipText,
          { color: selected ? colors.primaryDark : colors.ink },
        ]}
      >
        {label}
      </Text>
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
