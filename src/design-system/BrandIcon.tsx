import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

type BrandIconProps = {
  path: string;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

/** Glyphe marque Simple Icons (viewBox 24×24) via react-native-svg. */
export function BrandIcon({
  path,
  size = 20,
  color = '#12212B',
  style,
}: BrandIconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={style}
      accessibilityRole="image"
    >
      <Path d={path} fill={color} />
    </Svg>
  );
}
