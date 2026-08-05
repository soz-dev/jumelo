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
import { withHexAlpha } from '../constants/theme';
import { Icon, resolveCatalogIcon, type IconName } from '../design-system';

type Props = {
  catalogId: string;
  /** Largeur (et hauteur si `height` omis). */
  size?: number;
  /** Hauteur — pour jaquettes portrait (ex. Steam 2:3). */
  height?: number;
  /** Couleur du fallback Phosphor / SI */
  color?: string;
  /** Si true et fallback SI jeu dédié → fill marque */
  brandedFallback?: boolean;
  /** Force cover/contain (sinon valeur catalogue). */
  resizeMode?: 'cover' | 'contain';
  /** Rayon — `0` pour plein cadre. */
  borderRadius?: number;
  /** Opacité 0–1. */
  opacity?: number;
  style?: StyleProp<ViewStyle | ImageStyle>;
};

/**
 * Tuile artwork store. Si pas d’URL ou erreur réseau → Icon.
 */
export function GameArtImage({
  catalogId,
  size = 40,
  height,
  color = '#0F8F8A',
  brandedFallback = false,
  resizeMode: resizeModeProp,
  borderRadius: borderRadiusProp,
  opacity,
  style,
}: Props) {
  const art = getGameArt(catalogId);
  const [failed, setFailed] = useState(false);
  const w = size;
  const h = height ?? size;
  const radius =
    borderRadiusProp ?? Math.round(Math.min(w, h) * 0.14);
  const iconName: IconName = resolveCatalogIcon(catalogId);
  const hasSource = Boolean(art?.localSource || art?.imageUrl);

  if (!art || !hasSource || failed) {
    return (
      <View
        style={[
          styles.fallback,
          {
            width: w,
            height: h,
            borderRadius: radius,
            backgroundColor: withHexAlpha(color, 0.12),
            opacity,
          },
          style,
        ]}
      >
        <Icon
          name={iconName}
          size={Math.round(Math.min(w, h) * 0.42)}
          color={color}
          weight="bold"
          branded={brandedFallback}
        />
      </View>
    );
  }

  const resizeMode = resizeModeProp ?? art.resizeMode ?? 'cover';
  const imageStyle: StyleProp<ImageStyle> = [
    {
      width: w,
      height: h,
      borderRadius: radius,
      opacity,
      backgroundColor: resizeMode === 'contain' ? '#1A1A1A' : '#E8EEF2',
    },
    style as StyleProp<ImageStyle>,
  ];

  return (
    <Image
      source={art.localSource ?? { uri: art.imageUrl! }}
      accessibilityRole="image"
      resizeMode={resizeMode}
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
