import { Ionicons } from '@expo/vector-icons';
import type { Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { fonts, radii, spacing } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { safeBack } from '../lib/navigation';

export function SettingsBackHeader({
  title,
  subtitle,
  fallback = '/(tabs)/profile',
}: {
  title: string;
  subtitle?: string;
  /** Écran de repli si l’historique est vide (deep link). */
  fallback?: Href;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.header}>
      <Pressable
        onPress={() => safeBack(fallback)}
        accessibilityRole="button"
        accessibilityLabel="Retour"
        style={[styles.backBtn, { backgroundColor: colors.white, borderColor: colors.border }]}
      >
        <Ionicons name="chevron-back" size={22} color={colors.ink} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: colors.ink }]} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.inkMuted }]}>{subtitle}</Text>
        ) : null}
      </View>
    </View>
  );
}

export function SettingsSectionLabel({ label }: { label: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.sectionLabel, { color: colors.inkMuted }]}>{label}</Text>;
}

export function SettingsRow({
  icon,
  label,
  hint,
  onPress,
  danger,
  right,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint?: string;
  onPress?: () => void;
  danger?: boolean;
  right?: ReactNode;
}) {
  const { colors } = useTheme();
  const content = (
    <>
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: danger ? colors.accentSoft : colors.primarySoft },
        ]}
      >
        <Ionicons name={icon} size={18} color={danger ? colors.accent : colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: danger ? colors.accent : colors.ink }]}>
          {label}
        </Text>
        {hint ? (
          <Text style={[styles.rowHint, { color: colors.inkFaint }]}>{hint}</Text>
        ) : null}
      </View>
      {right ??
        (onPress ? (
          <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
        ) : null)}
    </>
  );

  if (!onPress) {
    return (
      <View style={[styles.row, { backgroundColor: colors.white, borderColor: colors.border }]}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.white, borderColor: colors.border, opacity: pressed ? 0.9 : 1 },
      ]}
    >
      {content}
    </Pressable>
  );
}

export function SettingsToggleRow({
  icon,
  label,
  hint,
  value,
  onValueChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  const { colors } = useTheme();
  return (
    <SettingsRow
      icon={icon}
      label={label}
      hint={hint}
      right={
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: colors.border, true: colors.primarySoft }}
          thumbColor={value ? colors.primary : colors.inkFaint}
          accessibilityLabel={label}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.displaySemi,
    fontSize: 22,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: 2,
  },
  sectionLabel: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
  },
  rowHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
});
