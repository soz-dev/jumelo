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
  /** Teinte selected (défaut = primary thème). */
  accent?: string;
  /**
   * `default` — fond soft / blanc, selected = fill discret + bordure.
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
  accent,
  tone = 'default',
}: ChipProps) {
  const { colors } = useTheme();
  const iconName = name ?? icon;
  const scale = useSharedValue(1);
  const tintColor = accent ?? colors.primary;

  const surface =
    tone === 'glass'
      ? {
          backgroundColor: selected
            ? 'rgba(255,255,255,0.88)'
            : 'rgba(255,255,255,0.72)',
          borderColor: selected ? tintColor : 'rgba(255,255,255,0.92)',
        }
      : tone === 'outline'
        ? {
            backgroundColor: selected
              ? withHexAlpha(tintColor, 0.12)
              : 'rgba(255,255,255,0.55)',
            borderColor: selected
              ? tintColor
              : withHexAlpha(colors.primaryLight, 0.85),
          }
        : selected
          ? {
              backgroundColor: withHexAlpha(tintColor, 0.12),
              borderColor: tintColor,
            }
          : {
              backgroundColor: colors.white,
              borderColor: colors.border,
            };

  const tint =
    tone === 'glass' && !selected
      ? colors.ink
      : selected
        ? tintColor
        : colors.inkMuted;

  const labelColor =
    tone === 'glass' && !selected
      ? colors.ink
      : selected
        ? tintColor
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
