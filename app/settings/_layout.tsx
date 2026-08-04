import { Stack } from 'expo-router';

import { baseColors } from '../../src/constants/theme';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: baseColors.cream },
        animation: 'slide_from_right',
      }}
    />
  );
}
