import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { colors } from '../src/constants/theme';
import { useAuth } from '../src/context/AuthContext';
import { hasAcceptedCurrentLegal } from '../src/legal';
import {
  getIntroOnboardingDoneSync,
  isIntroOnboardingDone,
} from '../src/lib/introOnboarding';

export default function Index() {
  const { user, loading } = useAuth();
  const [introDone, setIntroDone] = useState<boolean | null>(() => getIntroOnboardingDoneSync());
  const [legalOk, setLegalOk] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    isIntroOnboardingDone().then((done) => {
      if (active) setIntroDone(done);
    });
    return () => {
      active = false;
    };
  }, []);

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

  if (introDone === null) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.cream,
        }}
      >
        <ActivityIndicator color={colors.coral} size="large" />
      </View>
    );
  }

  /** Intro ludique one-shot — avant auth, une seule fois par install. */
  if (!introDone) {
    return <Redirect href="/(intro)" />;
  }

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
        <ActivityIndicator color={colors.coral} size="large" />
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
