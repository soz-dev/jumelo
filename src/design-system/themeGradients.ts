/**
 * Dégradés dérivés de la palette thème active (ThemeContext).
 * primarySoft → primaryLight → primary → primaryDark
 */
import {
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
};

/** Stop « ciel » entre soft et primary. */
export function resolvePrimaryLight(source: ThemeGradientSource): string {
  return source.primaryLight ?? mixHex(source.primarySoft, source.primary, 0.32);
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

export const themeGradientAngles = {
  wash: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  brand: { start: { x: 0, y: 0.2 }, end: { x: 1, y: 0.9 } },
} as const;
