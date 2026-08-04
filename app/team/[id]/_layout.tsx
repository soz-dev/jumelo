import { Stack } from 'expo-router';

import { baseColors } from '../../../src/constants/theme';

export default function TeamIdLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: baseColors.cream },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="rate"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
    </Stack>
  );
}
