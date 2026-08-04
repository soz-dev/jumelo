import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';

import { useTheme } from '../context/ThemeContext';
import { fonts, iconSizes, radii, spacing, typography } from './tokens';

type TextFieldProps = TextInputProps & {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  containerStyle?: ViewStyle;
  /** Mot de passe avec toggle œil */
  secureToggle?: boolean;
};

export function TextField({
  label,
  error,
  hint,
  leftIcon,
  containerStyle,
  secureToggle,
  secureTextEntry,
  style,
  ...rest
}: TextFieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(Boolean(secureTextEntry || secureToggle));

  const borderColor = error
    ? colors.accent
    : focused
      ? colors.primary
      : colors.border;

  return (
    <View style={[{ marginBottom: spacing.md }, containerStyle]}>
      {label ? (
        <Text style={[styles.label, { color: colors.inkMuted }]}>{label}</Text>
      ) : null}
      <View
        style={[
          styles.field,
          {
            backgroundColor: colors.white,
            borderColor,
          },
        ]}
      >
        {leftIcon ? (
          <Ionicons
            name={leftIcon}
            size={iconSizes.sm}
            color={focused ? colors.primary : colors.inkFaint}
            style={{ marginRight: 8 }}
          />
        ) : null}
        <TextInput
          {...rest}
          secureTextEntry={secureToggle ? hidden : secureTextEntry}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          placeholderTextColor={colors.inkFaint}
          style={[styles.input, { color: colors.ink }, style]}
        />
        {secureToggle ? (
          <Pressable
            onPress={() => setHidden((v) => !v)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Afficher le mot de passe' : 'Masquer'}
          >
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={iconSizes.sm}
              color={colors.inkMuted}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text style={[styles.meta, { color: colors.accent }]}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.meta, { color: colors.inkFaint }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography.label,
    marginBottom: 6,
  },
  field: {
    minHeight: 52,
    borderRadius: radii.md,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 16,
    paddingVertical: 12,
  },
  meta: {
    ...typography.caption,
    marginTop: 6,
  },
});
