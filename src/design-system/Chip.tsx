import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import { fonts, iconSizes, radii } from './tokens';

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  emoji?: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

export function Chip({ label, selected, onPress, emoji, icon }: ChipProps) {
  const { colors } = useTheme();
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
      {emoji ? <Text style={{ marginRight: 4 }}>{emoji}</Text> : null}
      {icon ? (
        <Ionicons
          name={icon}
          size={iconSizes.xs}
          color={selected ? colors.primaryDark : colors.inkMuted}
          style={{ marginRight: 6 }}
        />
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
