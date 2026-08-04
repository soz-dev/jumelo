import LottieView from 'lottie-react-native';
import React, { useRef } from 'react';
import { StyleProp, ViewStyle } from 'react-native';

const sources = {
  bolt: require('../../assets/lottie/bolt.json'),
  success: require('../../assets/lottie/success.json'),
  loading: require('../../assets/lottie/loading.json'),
  spark: require('../../assets/lottie/spark.json'),
  confetti: require('../../assets/lottie/confetti.json'),
} as const;

export type LottieName = keyof typeof sources;

type Props = {
  name: LottieName;
  size?: number;
  loop?: boolean;
  autoPlay?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function JumeloLottie({
  name,
  size = 64,
  loop = true,
  autoPlay = true,
  style,
}: Props) {
  const ref = useRef<LottieView>(null);
  return (
    <LottieView
      ref={ref}
      source={sources[name]}
      autoPlay={autoPlay}
      loop={loop}
      style={[{ width: size, height: size }, style]}
    />
  );
}
