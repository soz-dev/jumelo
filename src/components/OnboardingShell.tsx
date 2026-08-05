import { router } from 'expo-router';
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
  footer,
  onNext,
  nextLabel = 'Continuer',
  nextDisabled,
}: {
  step: number;
  total?: number;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  /** Contenu fixe entre le scroll et le CTA (ex. message d’erreur). */
  footer?: React.ReactNode;
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
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.bodyContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
        {footer}
        <Button label={nextLabel} onPress={onNext} disabled={nextDisabled} />
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  flex: {
    flex: 1,
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
  bodyContent: {
    paddingBottom: spacing.lg,
    flexGrow: 1,
  },
});
