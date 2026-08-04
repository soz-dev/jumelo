import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import {
  Outfit_700Bold,
  Outfit_800ExtraBold,
} from '@expo-google-fonts/outfit';
import {
  Syne_600SemiBold,
  Syne_700Bold,
  useFonts,
} from '@expo-google-fonts/syne';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { baseColors } from '../src/constants/theme';
import { AdminWarningGate } from '../src/components/AdminWarningGate';
import { PushBootstrap } from '../src/components/PushBootstrap';
import { AuthProvider } from '../src/context/AuthContext';
import { TeamsProvider } from '../src/context/TeamsContext';
import { ThemeProvider } from '../src/context/ThemeContext';
import {
  clearStaleWebAuthSession,
  completeAuthSessionIfNeeded,
  isWebOAuthCallbackUrl,
} from '../src/lib/completeAuthSession';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

/** Popup Google : UI minimale, sans auth/fonts — évite flash welcome puis fermeture. */
function WebOAuthPopupLayout() {
  useEffect(() => {
    completeAuthSessionIfNeeded();
  }, []);

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: baseColors.cream,
        gap: 16,
      }}
    >
      <ActivityIndicator color="#0F8F8A" size="large" />
    </View>
  );
}

export default function RootLayout() {
  const oauthPopup = Platform.OS === 'web' && isWebOAuthCallbackUrl();

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (oauthPopup) {
      completeAuthSessionIfNeeded();
      return;
    }
    clearStaleWebAuthSession();
  }, [oauthPopup]);

  if (oauthPopup) {
    return <WebOAuthPopupLayout />;
  }

  return <AppRootLayout />;
}

function AppRootLayout() {
  const [fontsLoaded] = useFonts({
    Outfit_800ExtraBold,
    Outfit_700Bold,
    Syne_700Bold,
    Syne_600SemiBold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: baseColors.cream,
        }}
      >
        <ActivityIndicator color="#0F8F8A" size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <TeamsProvider>
          <ThemeProvider>
            <StatusBar style="dark" />
            <PushBootstrap />
            <AdminWarningGate />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: baseColors.cream },
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="(intro)" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(onboarding)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="oauth" />
              <Stack.Screen name="user/[id]" />
              <Stack.Screen name="match/[id]" options={{ presentation: 'modal' }} />
              <Stack.Screen
                name="match-success/[id]"
                options={{ presentation: 'modal', animation: 'fade' }}
              />
              <Stack.Screen
                name="liked-me/[id]"
                options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
              />
              <Stack.Screen name="likes/index" />
              <Stack.Screen
                name="premium"
                options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
              />
              <Stack.Screen name="chat/[id]" />
              <Stack.Screen name="team/[id]" />
              <Stack.Screen name="team/create" options={{ presentation: 'modal' }} />
              <Stack.Screen name="maintenant/index" />
              <Stack.Screen name="maintenant/searching" />
              <Stack.Screen name="maintenant/results" />
              <Stack.Screen name="invite/[userId]" options={{ presentation: 'modal' }} />
              <Stack.Screen name="categories/index" />
              <Stack.Screen name="settings" />
              <Stack.Screen name="admin" />
            </Stack>
          </ThemeProvider>
        </TeamsProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
