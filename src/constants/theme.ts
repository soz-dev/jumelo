export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radii = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
};

export const fonts = {
  display: 'Outfit_800ExtraBold',
  displaySemi: 'Outfit_700Bold',
  displaySoft: 'Syne_700Bold',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodyBold: 'DMSans_700Bold',
};

export const shadows = {
  soft: {
    shadowColor: '#12212B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
};

export type ThemeId =
  | 'teal'
  | 'coral'
  | 'purple'
  | 'blue'
  | 'orange'
  | 'pink'
  | 'green'
  | 'indigo'
  | 'rose'
  | 'cyan';

export type ThemePalette = {
  id: ThemeId;
  label: string;
  primary: string;
  primaryDark: string;
  primarySoft: string;
  accent: string;
  accentSoft: string;
};

/**
 * Charte Jumelo active = bleu.
 * Les autres palettes restent définies pour plus tard (sélecteur en standby).
 */
export const themePalettes: ThemePalette[] = [
  {
    id: 'blue',
    label: 'Jumelo',
    primary: '#2F6BFF',
    primaryDark: '#1B4ED8',
    primarySoft: '#E8EFFF',
    accent: '#38BDF8',
    accentSoft: '#E0F2FE',
  },
  // —— Standby : réactiver avec le panneau de thèmes ——
  {
    id: 'coral',
    label: 'Coral',
    primary: '#FF4B2B',
    primaryDark: '#E03A1C',
    primarySoft: '#FFE8E4',
    accent: '#0F8F8A',
    accentSoft: '#E6F6F5',
  },
  {
    id: 'teal',
    label: 'Teal',
    primary: '#0F8F8A',
    primaryDark: '#0A6B67',
    primarySoft: '#E6F6F5',
    accent: '#FF4B2B',
    accentSoft: '#FFE8E4',
  },
  {
    id: 'purple',
    label: 'Violet',
    primary: '#7C5CFC',
    primaryDark: '#5B3FD4',
    primarySoft: '#F0ECFF',
    accent: '#FF5A45',
    accentSoft: '#FFE8E4',
  },
  {
    id: 'orange',
    label: 'Orange',
    primary: '#F59E0B',
    primaryDark: '#D97706',
    primarySoft: '#FEF3C7',
    accent: '#7C5CFC',
    accentSoft: '#F0ECFF',
  },
  {
    id: 'pink',
    label: 'Rose',
    primary: '#EC4899',
    primaryDark: '#DB2777',
    primarySoft: '#FCE7F3',
    accent: '#0F8F8A',
    accentSoft: '#E6F6F5',
  },
  {
    id: 'green',
    label: 'Vert',
    primary: '#10B981',
    primaryDark: '#059669',
    primarySoft: '#D1FAE5',
    accent: '#F59E0B',
    accentSoft: '#FEF3C7',
  },
  {
    id: 'indigo',
    label: 'Indigo',
    primary: '#6366F1',
    primaryDark: '#4F46E5',
    primarySoft: '#EEF2FF',
    accent: '#EC4899',
    accentSoft: '#FCE7F3',
  },
  {
    id: 'rose',
    label: 'Framboise',
    primary: '#F43F5E',
    primaryDark: '#E11D48',
    primarySoft: '#FFE4E6',
    accent: '#3B82F6',
    accentSoft: '#EBF2FF',
  },
  {
    id: 'cyan',
    label: 'Cyan',
    primary: '#06B6D4',
    primaryDark: '#0891B2',
    primarySoft: '#CFFAFE',
    accent: '#F59E0B',
    accentSoft: '#FEF3C7',
  },
];

/** Charte graphique Jumelo — bleu (palettes multi en standby). */
export const DEFAULT_THEME_ID: ThemeId = 'blue';

export const baseColors = {
  /** Encre bleutée — titres / corps */
  ink: '#1E2F42',
  inkMuted: '#5A6F82',
  inkFaint: '#8B9AAB',
  /** Fond app froid, aligné charte bleue */
  cream: '#F2F5FA',
  white: '#FFFFFF',
  border: '#DCE3EC',
  success: '#1FA97A',
  warning: '#E8A317',
  online: '#22C55E',
};

/** Couleurs de catégorie (indépendantes du thème UI) */
export const categoryColors: Record<string, string> = {
  gaming: '#7C5CFC',
  sports: '#0F8F8A',
  education: '#3B82F6',
  music: '#F59E0B',
  hobbies: '#EC4899',
};

/** @deprecated Prefer useTheme().colors — kept for gradual migration */
export const colors = {
  teal: '#2F6BFF',
  tealDark: '#1B4ED8',
  tealSoft: '#E8EFFF',
  coral: '#38BDF8',
  coralSoft: '#E0F2FE',
  ...baseColors,
};

export function resolveTheme(id: ThemeId): ThemePalette {
  // Standby multi-thèmes : toujours la charte bleue Jumelo.
  return (
    themePalettes.find((t) => t.id === DEFAULT_THEME_ID) ??
    themePalettes.find((t) => t.id === id) ??
    themePalettes[0]
  );
}

function clampByte(n: number) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function parseHex(hex: string): [number, number, number] {
  const raw = hex.replace('#', '').trim();
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw.slice(0, 6);
  const n = Number.parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Mélange deux hex (t = 0 → a, t = 1 → b). */
export function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = parseHex(a);
  const [br, bg, bb] = parseHex(b);
  const u = Math.max(0, Math.min(1, t));
  const r = clampByte(ar + (br - ar) * u);
  const g = clampByte(ag + (bg - ag) * u);
  const bl = clampByte(ab + (bb - ab) * u);
  return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)}`;
}

export function withHexAlpha(hex: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  const [r, g, b] = parseHex(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/** Stop clair entre soft et primary (dégradés themeWash / themeBrand). */
export function derivePrimaryLight(palette: ThemePalette): string {
  return mixHex(palette.primarySoft, palette.primary, 0.32);
}

export function buildColors(palette: ThemePalette) {
  return {
    ...baseColors,
    primary: palette.primary,
    primaryDark: palette.primaryDark,
    primarySoft: palette.primarySoft,
    primaryLight: derivePrimaryLight(palette),
    accent: palette.accent,
    accentSoft: palette.accentSoft,
    teal: palette.primary,
    tealDark: palette.primaryDark,
    tealSoft: palette.primarySoft,
    coral: palette.accent,
    coralSoft: palette.accentSoft,
  };
}

export type AppColors = ReturnType<typeof buildColors>;
