import Lottie from 'lottie-react';
import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

import bolt from '../../assets/lottie/bolt.json';
import confetti from '../../assets/lottie/confetti.json';
import loading from '../../assets/lottie/loading.json';
import spark from '../../assets/lottie/spark.json';
import success from '../../assets/lottie/success.json';

export type LottieName = 'bolt' | 'success' | 'loading' | 'spark' | 'confetti';

type Props = {
  name: LottieName;
  size?: number;
  loop?: boolean;
  autoPlay?: boolean;
  style?: StyleProp<ViewStyle>;
};

const sources: Record<LottieName, object> = {
  bolt,
  success,
  loading,
  spark,
  confetti,
};

/**
 * Web — vrai Lottie via `lottie-react` (JSON).
 * iOS / Android utilisent `JumeloLottie.tsx` (`lottie-react-native`).
 */
export function JumeloLottie({
  name,
  size = 64,
  loop = true,
  autoPlay = true,
  style,
}: Props) {
  return (
    <View
      style={[{ width: size, height: size, overflow: 'hidden' }, style]}
      accessibilityLabel={name}
    >
      <Lottie
        animationData={sources[name]}
        loop={loop}
        autoplay={autoPlay}
        style={{ width: size, height: size }}
      />
    </View>
  );
}
