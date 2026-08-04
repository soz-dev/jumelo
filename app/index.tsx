import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { colors } from '../src/constants/theme';
import { useAuth } from '../src/context/AuthContext';
import { hasAcceptedCurrentLegal } from '../src/legal';

export default function Index() {
  const { user, loading } = useAuth();
  const [legalOk, setLegalOk] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    if (!user) {
      setLegalOk(null);
      return;
    }
    setLegalOk(null);
    hasAcceptedCurrentLegal().then((ok) => {
      if (active) setLegalOk(ok);
    });
    return () => {
      active = false;
    };
  }, [user?.id]);

  if (loading || (user && legalOk === null)) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.cream,
        }}
      >
        <ActivityIndicator color={colors.teal} size="large" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (!legalOk) {
    return <Redirect href="/settings/accept" />;
  }

  if (!user.onboardingComplete) {
    return <Redirect href="/(onboarding)/univers" />;
  }

  return <Redirect href="/(tabs)/home" />;
}
