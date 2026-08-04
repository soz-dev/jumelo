import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useTheme } from '../context/ThemeContext';
import { withHexAlpha } from '../constants/theme';
import { Icon, type IconName } from './Icon';
import { fonts, iconSizes, motion, radii } from './tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
  const scale = useSharedValue(1);

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
        : selected
          ? {
              backgroundColor: withHexAlpha(colors.primary, 0.14),
              borderColor: withHexAlpha(colors.primary, 0.55),
            }
          : {
              backgroundColor: withHexAlpha(colors.primarySoft, 0.75),
              borderColor: colors.border,
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
        ? colors.primaryDark
        : colors.inkMuted;

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={!onPress}
      onPressIn={() => {
        if (onPress) scale.value = withSpring(0.96, motion.spring);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, motion.spring);
      }}
      style={[styles.chip, surface, animStyle]}
    >
      {iconName ? (
        <Icon
          name={iconName}
          size={iconSizes.xs}
          color={tint}
          weight={selected ? 'fill' : 'bold'}
          branded={branded}
          style={{ marginRight: 6 }}
        />
      ) : emoji ? (
        <Text style={{ marginRight: 4 }}>{emoji}</Text>
      ) : null}
      <Text
        style={[
          styles.chipText,
          { color: labelColor, fontFamily: selected ? fonts.bodyBold : fonts.bodyMedium },
        ]}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
});
