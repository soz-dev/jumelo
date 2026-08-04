import { Stack } from 'expo-router';

import { colors } from '../../src/constants/theme';

export default function IntroLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: colors.cream },
        gestureEnabled: false,
      }}
    />
  );
}
