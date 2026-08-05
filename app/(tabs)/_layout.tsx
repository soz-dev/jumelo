import { Redirect, Tabs, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { elevation, fonts, Icon, type IconName, withHexAlpha } from '../../src/design-system';
import { useAuth } from '../../src/context/AuthContext';
import { useTeams } from '../../src/context/TeamsContext';
import { useTheme } from '../../src/context/ThemeContext';
import { countMyDmUnread } from '../../src/lib/api/messages';
import { countTeamChatsUnread } from '../../src/lib/api/teamChats';

function TabIcon({ name, color, focused }: { name: IconName; color: string; focused: boolean }) {
  // LinkSimple (jumelo) produit un fond carré en fill — bold suffit pour l'état actif
  const weight = focused ? (name === 'jumelo' ? 'bold' : 'fill') : 'regular';
  return <Icon name={name} size={24} color={color} weight={weight} />;
}

function formatUnread(n: number): string {
  return n > 9 ? '9+' : String(n);
}

export default function TabsLayout() {
  const { user, loading } = useAuth();
  const { colors } = useTheme();
  const { teams } = useTeams();
  const [messagesUnread, setMessagesUnread] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        if (!user?.id) {
          if (active) setMessagesUnread(0);
          return;
        }
        const [dms, groups] = await Promise.all([
          countMyDmUnread(user.id),
          countTeamChatsUnread(user.id, teams),
        ]);
        if (active) setMessagesUnread(dms + groups);
      })();
      return () => {
        active = false;
      };
    }, [user?.id, teams]),
  );

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

  if (!user.onboardingComplete) {
    return <Redirect href="/(onboarding)/univers" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inkFaint,
        tabBarLabelStyle: {
          fontFamily: fonts.bodyMedium,
          fontSize: 11,
          letterSpacing: 0.2,
        },
        tabBarStyle: {
          backgroundColor: withHexAlpha(colors.cream, 0.96),
          borderTopColor: withHexAlpha(colors.primary, 0.1),
          borderTopWidth: 1,
          height: 90,
          paddingTop: 10,
          ...elevation.soft,
          shadowOpacity: 0.06,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Classement',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="trophy" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="teams"
        options={{
          title: 'Lobby',
          tabBarAccessibilityLabel: 'Lobby',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="social" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Messages',
          tabBarBadge: messagesUnread > 0 ? formatUnread(messagesUnread) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#EF4444',
            color: '#fff',
            fontSize: 11,
            fontFamily: fonts.bodyBold,
          },
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="chat" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="profile" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
