import { Image, StyleSheet, type ImageStyle, type StyleProp, View, type ViewStyle } from 'react-native';

type Props = {
  /** Taille du côté (carré). Défaut 36. */
  size?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
};

/**
 * Marque Jumelo (icône app) pour headers / auth / intro.
 */
export function BrandLogo({ size = 36, style, imageStyle }: Props) {
  const radius = Math.round(size * 0.22);
  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: radius,
        },
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel="Jumelo"
    >
      <Image
        source={require('../../assets/icon.png')}
        style={[
          {
            width: size,
            height: size,
            borderRadius: radius,
          },
          imageStyle,
        ]}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
  },
});
