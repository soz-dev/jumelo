import React from 'react';
import { Text, TextStyle } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import { typography } from './tokens';

export function Title({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: TextStyle;
}) {
  const { colors } = useTheme();
  return <Text style={[typography.display, { color: colors.ink }, style]}>{children}</Text>;
}

export function Subtitle({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: TextStyle;
}) {
  const { colors } = useTheme();
  return <Text style={[typography.body, { color: colors.inkMuted }, style]}>{children}</Text>;
}
