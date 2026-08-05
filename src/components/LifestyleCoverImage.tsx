import React, { useState } from 'react';
import {
  Image,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { withHexAlpha } from '../constants/theme';
import { Icon, type IconName } from '../design-system';

type Props = {
  uri: string;
  width: number;
  height: number;
  /** Couleur fallback si chargement échoue. */
  color?: string;
  iconName?: IconName;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Photo lifestyle plein cadre (Unsplash) pour onboarding Netflix-style.
 */
export function LifestyleCoverImage({
  uri,
  width,
  height,
  color = '#0F8F8A',
  iconName = 'spark',
  borderRadius = 0,
  style,
}: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <View
        style={[
          styles.fallback,
          {
            width,
            height,
            borderRadius,
            backgroundColor: withHexAlpha(color, 0.18),
          },
          style,
        ]}
      >
        <Icon
          name={iconName}
          size={Math.round(Math.min(width, height) * 0.28)}
          color={color}
          weight="bold"
        />
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#12151A',
        },
        style,
      ]}
      resizeMode="cover"
      onError={() => setFailed(true)}
      accessibilityIgnoresInvertColors
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
