/**
 * Tokens Jumelo — fondation visuelle.
 * Les couleurs dynamiques viennent de ThemeContext via `useTheme().colors`.
 */
import { StyleSheet, TextStyle, ViewStyle } from 'react-native';

import {
  AppColors,
  baseColors,
  fonts,
  radii as baseRadii,
  shadows as baseShadows,
  spacing as baseSpacing,
} from '../constants/theme';

export { fonts, baseColors };
export type { AppColors };

/** Échelle d’espacement (4pt grid) */
export const spacing = {
  ...baseSpacing,
  /** 2 */
  xxs: 2,
  /** 12 — entre sm et md */
  smd: 12,
  /** 20 */
  ml: 20,
  /** 40 */
  xl2: 40,
  /** 64 */
  xxxl: 64,
} as const;

/** Rayons — évolue la base Jumelo (plus expressif, moins “card-box”) */
export const radii = {
  ...baseRadii,
  xs: 6,
  xl: 28,
  full: 9999,
} as const;

/** Échelle typographique Outfit / DM Sans / Syne */
export const typography = {
  hero: {
    fontFamily: fonts.display,
    fontSize: 42,
    lineHeight: 46,
    letterSpacing: -1.4,
  } satisfies TextStyle,
  display: {
    fontFamily: fonts.display,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.9,
  } satisfies TextStyle,
  title: {
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.7,
  } satisfies TextStyle,
  titleSm: {
    fontFamily: fonts.displaySemi,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.4,
  } satisfies TextStyle,
  section: {
    fontFamily: fonts.displaySemi,
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.3,
  } satisfies TextStyle,
  body: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
  } satisfies TextStyle,
  bodyMd: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    lineHeight: 22,
  } satisfies TextStyle,
  bodyBold: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    lineHeight: 22,
  } satisfies TextStyle,
  caption: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  } satisfies TextStyle,
  overline: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    lineHeight: 18,
  } satisfies TextStyle,
} as const;

/** Élévations / ombres thématiques */
export const elevation = {
  none: {} as ViewStyle,
  soft: {
    ...baseShadows.soft,
  } as ViewStyle,
  lift: {
    shadowColor: '#12212B',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  } as ViewStyle,
  glow: (color: string): ViewStyle => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 10,
  }),
  /** Alias rétrocompat */
  softLegacy: baseShadows.soft,
} as const;

/** Tailles d’icônes Ionicons */
export const iconSizes = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 28,
  xl: 36,
} as const;

/** Durées d’animation intentionnelles */
export const motion = {
  fast: 160,
  base: 240,
  slow: 380,
  spring: { damping: 18, stiffness: 220 },
} as const;

/** Surfaces — plans légers (éviter le sur-carding) */
export const surface = {
  inset: 1,
  hairline: StyleSheet.hairlineWidth,
} as const;
