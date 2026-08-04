import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  AppColors,
  DEFAULT_THEME_ID,
  ThemeId,
  ThemePalette,
  buildColors,
  resolveTheme,
  themePalettes,
} from '../constants/theme';
import { useAuth } from './AuthContext';

const STORAGE_KEY = '@jumelo/theme';

type ThemeContextValue = {
  themeId: ThemeId;
  palette: ThemePalette;
  colors: AppColors;
  palettes: ThemePalette[];
  setThemeId: (id: ThemeId) => Promise<void>;
  cycleTheme: () => Promise<void>;
  loading: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user, updateProfile } = useAuth();
  const [themeId, setThemeIdState] = useState<ThemeId>(DEFAULT_THEME_ID);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!active) return;
        if (raw && themePalettes.some((p) => p.id === raw)) {
          setThemeIdState(raw as ThemeId);
        } else {
          // Première visite / pas de préférence → charte logo Jumelo
          setThemeIdState(DEFAULT_THEME_ID);
          await AsyncStorage.setItem(STORAGE_KEY, DEFAULT_THEME_ID);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Prefer profile.themeId when logged in (Supabase or local)
  useEffect(() => {
    if (!user?.themeId) return;
    if (!themePalettes.some((p) => p.id === user.themeId)) return;
    if (user.themeId === themeId) return;
    setThemeIdState(user.themeId);
    AsyncStorage.setItem(STORAGE_KEY, user.themeId).catch(() => undefined);
  }, [user?.themeId, themeId]);

  const setThemeId = useCallback(
    async (id: ThemeId) => {
      setThemeIdState(id);
      await AsyncStorage.setItem(STORAGE_KEY, id);
      // AsyncStorage = cache locale ; profiles.theme_id via updateProfile si connecté
      if (user && user.themeId !== id) {
        await updateProfile({ themeId: id });
      }
    },
    [user, updateProfile],
  );

  const cycleTheme = useCallback(async () => {
    const index = themePalettes.findIndex((p) => p.id === themeId);
    const next = themePalettes[(index + 1) % themePalettes.length];
    await setThemeId(next.id);
  }, [setThemeId, themeId]);

  const palette = useMemo(() => resolveTheme(themeId), [themeId]);
  const colors = useMemo(() => buildColors(palette), [palette]);

  const value = useMemo(
    () => ({
      themeId,
      palette,
      colors,
      palettes: themePalettes,
      setThemeId,
      cycleTheme,
      loading,
    }),
    [themeId, palette, colors, setThemeId, cycleTheme, loading],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
