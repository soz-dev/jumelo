import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { baseColors } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { useIsAdmin } from '../../src/lib/admin';

export default function AdminLayout() {
  const { user, loading } = useAuth();
  const { colors } = useTheme();
  const isAdmin = useIsAdmin();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (!isAdmin) {
    return <Redirect href="/(tabs)/home" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: baseColors.cream },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="members" />
      <Stack.Screen name="teams" />
      <Stack.Screen name="reports" />
      <Stack.Screen name="activity" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
