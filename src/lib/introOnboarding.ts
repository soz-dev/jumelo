import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Flag device-local : intro ludique (one-shot premier lancement).
 * Disparaît à la désinstallation (AsyncStorage). Non lié au compte auth.
 */
export const INTRO_ONBOARDING_KEY = 'jumelo_onboarding_done';

/** Cache synchrone pour éviter le bounce Redirect → intro après finish. */
let introDoneCache: boolean | null = null;

export function getIntroOnboardingDoneSync(): boolean | null {
  return introDoneCache;
}

export async function isIntroOnboardingDone(): Promise<boolean> {
  if (introDoneCache !== null) return introDoneCache;
  try {
    const value = await AsyncStorage.getItem(INTRO_ONBOARDING_KEY);
    const done = value === '1' || value === 'true';
    introDoneCache = done;
    return done;
  } catch {
    return false;
  }
}

export async function markIntroOnboardingDone(): Promise<void> {
  introDoneCache = true;
  await AsyncStorage.setItem(INTRO_ONBOARDING_KEY, '1');
}

/** Utile en __DEV__ pour revoir l’intro sans réinstaller. */
export async function resetIntroOnboarding(): Promise<void> {
  introDoneCache = false;
  await AsyncStorage.removeItem(INTRO_ONBOARDING_KEY);
}
