import React, { useState } from 'react';
import {
  Image,
  StyleSheet,
  View,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { getGameArt } from '../constants/gameArt';
import { Icon, resolveCatalogIcon, type IconName } from '../design-system';

type Props = {
  catalogId: string;
  size?: number;
  /** Couleur du fallback Phosphor / SI */
  color?: string;
  /** Si true et fallback SI jeu dédié → fill marque */
  brandedFallback?: boolean;
  style?: StyleProp<ViewStyle | ImageStyle>;
};

/**
 * Tuile artwork store (carré arrondi). Si pas d’URL ou erreur réseau → Icon.
 */
export function GameArtImage({
  catalogId,
  size = 40,
  color = '#0F8F8A',
  brandedFallback = false,
  style,
}: Props) {
  const art = getGameArt(catalogId);
  const [failed, setFailed] = useState(false);
  const radius = Math.round(size * 0.22);
  const iconName: IconName = resolveCatalogIcon(catalogId);

  if (!art || failed) {
    return (
      <View
        style={[
          styles.fallback,
          { width: size, height: size, borderRadius: radius },
          style,
        ]}
      >
        <Icon
          name={iconName}
          size={Math.round(size * 0.62)}
          color={color}
          weight="bold"
          branded={brandedFallback}
        />
      </View>
    );
  }

  const imageStyle: StyleProp<ImageStyle> = [
    {
      width: size,
      height: size,
      borderRadius: radius,
      backgroundColor: '#E8EEF2',
    },
    style as StyleProp<ImageStyle>,
  ];

  return (
    <Image
      source={{ uri: art.imageUrl }}
      accessibilityRole="image"
      resizeMode="cover"
      onError={() => setFailed(true)}
      style={imageStyle}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
