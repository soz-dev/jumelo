import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import { fonts, iconSizes, radii, spacing, surface, typography } from './tokens';

type ListRowProps = {
  title: string;
  subtitle?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  danger?: boolean;
  style?: ViewStyle;
  /** Bordure basse seule (liste dense) vs surface isolée */
  inset?: boolean;
};

export function ListRow({
  title,
  subtitle,
  left,
  right,
  onPress,
  chevron,
  danger,
  style,
  inset = true,
}: ListRowProps) {
  const { colors } = useTheme();
  const showChevron = chevron === true || (Boolean(onPress) && chevron !== false);
  const content = (
    <>
      {left}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={[styles.title, { color: danger ? colors.accent : colors.ink }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.sub, { color: colors.inkMuted }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
      {showChevron ? (
        <Ionicons name="chevron-forward" size={iconSizes.sm} color={colors.inkFaint} />
      ) : null}
    </>
  );

  const baseStyle = [
    styles.row,
    inset
      ? {
          backgroundColor: colors.white,
          borderColor: colors.border,
          borderWidth: surface.inset,
          borderRadius: radii.md,
          marginBottom: spacing.sm,
        }
      : {
          borderBottomWidth: surface.hairline,
          borderBottomColor: colors.border,
          paddingVertical: spacing.md,
        },
    style,
  ];

  if (!onPress) {
    return <View style={baseStyle}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [...baseStyle, { opacity: pressed ? 0.88 : 1 }]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
  },
  sub: {
    ...typography.caption,
    marginTop: 2,
  },
});
