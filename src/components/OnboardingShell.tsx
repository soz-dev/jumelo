import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button, Screen, Subtitle, Title, fonts, radii, spacing } from '../design-system';
import { useTheme } from '../context/ThemeContext';
import { safeBack } from '../lib/navigation';

export function OnboardingShell({
  step,
  total = 5,
  title,
  subtitle,
  children,
  onNext,
  nextLabel = 'Continuer',
  nextDisabled,
}: {
  step: number;
  total?: number;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <Screen atmosphere="soft" style={styles.safe}>
      <View style={styles.header}>
        <Pressable
          onPress={() =>
            step === 1 ? router.replace('/(auth)/welcome') : safeBack('/(auth)/welcome')
          }
        >
          <Text style={[styles.back, { color: colors.primary }]}>←</Text>
        </Pressable>
        <Text style={[styles.step, { color: colors.inkMuted }]}>
          {step}/{total}
        </Text>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${(step / total) * 100}%`,
              backgroundColor: colors.accent,
              borderRadius: radii.pill,
            },
          ]}
        />
      </View>
      <Animated.View entering={FadeInDown.duration(320)}>
        <Title style={{ marginTop: spacing.lg }}>{title}</Title>
        <Subtitle style={{ marginTop: spacing.sm, marginBottom: spacing.lg }}>
          {subtitle}
        </Subtitle>
      </Animated.View>
      <View style={styles.body}>{children}</View>
      <Button label={nextLabel} onPress={onNext} disabled={nextDisabled} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  back: {
    fontSize: 24,
    fontFamily: fonts.bodyBold,
  },
  step: {
    fontFamily: fonts.bodyMedium,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  body: {
    flex: 1,
  },
});
