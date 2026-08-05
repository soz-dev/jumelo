import React, { useState } from 'react';
import {
  Image,
  StyleSheet,
  View,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { getActivityArt } from '../constants/activityArt';
import { Icon, resolveCatalogIcon, type IconName } from '../design-system';

type Props = {
  catalogId: string;
  size?: number;
  /** Couleur du fallback Phosphor */
  color?: string;
  /**
   * Fond derrière l’emoji. `transparent` (défaut) laisse l’art coloré porter
   * le visuel — évite le look pastel mint + glyphe gris.
   */
  backgroundColor?: string;
  style?: StyleProp<ViewStyle | ImageStyle>;
};

/**
 * Tuile illustration colorée (Twemoji local) pour activités non-gaming.
 * Gaming → utiliser `GameArtImage`.
 */
export function ActivityArtImage({
  catalogId,
  size = 40,
  color = '#0186F0',
  backgroundColor = 'transparent',
  style,
}: Props) {
  const art = getActivityArt(catalogId);
  const [failed, setFailed] = useState(false);
  const radius = Math.round(size * 0.22);
  const iconName: IconName = resolveCatalogIcon(catalogId);
  const pad = Math.round(size * 0.12);

  if (!art || failed) {
    return (
      <View
        style={[
          styles.fallback,
          {
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor:
              backgroundColor === 'transparent'
                ? 'rgba(15,143,138,0.12)'
                : backgroundColor,
          },
          style,
        ]}
      >
        <Icon
          name={iconName}
          size={Math.round(size * 0.55)}
          color={color}
          weight="bold"
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor,
          padding: pad,
        },
        style,
      ]}
    >
      <Image
        source={art}
        accessibilityRole="image"
        resizeMode="contain"
        onError={() => setFailed(true)}
        style={styles.image as ImageStyle}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
