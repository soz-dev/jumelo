/**
 * Dégradés dérivés de la palette thème active (ThemeContext).
 * primarySoft → primaryLight → primary → primaryDark
 */
import {
  baseColors,
  mixHex,
  withHexAlpha,
  type AppColors,
  type ThemePalette,
} from '../constants/theme';

export { mixHex, withHexAlpha };

export type ThemeGradientSource = Pick<
  ThemePalette,
  'primary' | 'primaryDark' | 'primarySoft'
> & {
  primaryLight?: string;
  cream?: string;
};

/** Stop « ciel » entre soft et primary. */
export function resolvePrimaryLight(source: ThemeGradientSource): string {
  return source.primaryLight ?? mixHex(source.primarySoft, source.primary, 0.32);
}

/**
 * Fond app : cream → brume soft → bloom bleu très léger (Atmosphere / Screen).
 */
export function themeAtmosphereColors(
  source: ThemeGradientSource | AppColors,
): readonly [string, string, string] {
  const cream =
    'cream' in source && typeof source.cream === 'string'
      ? source.cream
      : baseColors.cream;
  const light = resolvePrimaryLight(source);
  const mist = mixHex(cream, source.primarySoft, 0.72);
  const bloom = mixHex(source.primarySoft, light, 0.4);
  return [cream, mist, bloom];
}

/**
 * Lavis doux pour cartes (« Vos points communs », bannières).
 * soft → light → teinte primaire très diluée.
 */
export function themeWashColors(
  source: ThemeGradientSource | AppColors,
): readonly [string, string, string] {
  const light = resolvePrimaryLight(source);
  const mid = mixHex(source.primarySoft, light, 0.55);
  const edge = mixHex(light, source.primary, 0.22);
  return [source.primarySoft, mid, edge];
}

/**
 * Dégradé marque : ciel → primary → dark (tags Discover, accents).
 */
export function themeBrandColors(
  source: ThemeGradientSource | AppColors,
): readonly [string, string, string] {
  const light = resolvePrimaryLight(source);
  return [light, source.primary, source.primaryDark];
}

/**
 * Hero plein écran / welcome : primary → dark → encre bleue.
 */
export function themeHeroColors(
  source: ThemeGradientSource | AppColors,
): readonly [string, string, string] {
  const deep = mixHex(source.primaryDark, '#061428', 0.42);
  return [source.primary, source.primaryDark, deep];
}

export const themeGradientAngles = {
  wash: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  brand: { start: { x: 0, y: 0.2 }, end: { x: 1, y: 0.9 } },
  atmosphere: { start: { x: 0.05, y: 0 }, end: { x: 0.95, y: 1 } },
} as const;
