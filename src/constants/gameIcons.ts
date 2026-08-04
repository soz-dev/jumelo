/**
 * Mapping catalogue Jumelo → glyphes marque (Simple Icons CC0 + pictogrammes locaux).
 *
 * Les marques restent propriété de leurs titulaires — voir LEGAL.md.
 * Absents de SI / local → fallback Phosphor via `Icon` (jamais d’emoji).
 */
import {
  siActivision,
  siAndroid,
  siBattledotnet,
  siBungie,
  siCounterstrike,
  siDiscord,
  siEa,
  siEpicgames,
  siFifa,
  siFortnite,
  siItchdotio,
  siLeagueoflegends,
  siMihoyo,
  siOrigin,
  siPlaystation,
  siRiotgames,
  siRoblox,
  siRockstargames,
  siSteam,
  siTwitch,
  siUbisoft,
  siValorant,
  siValve,
  type SimpleIcon,
} from 'simple-icons';

import {
  LOCAL_MINECRAFT_CUBE,
  LOCAL_NINTENDO_SWITCH,
  LOCAL_XBOX_PAD,
} from './localGameGlyphs';

export type BrandGlyph = {
  slug: string;
  title: string;
  path: string;
  /** Hex marque (sans #) */
  hex: string;
};

function toGlyph(icon: SimpleIcon): BrandGlyph {
  return {
    slug: icon.slug,
    title: icon.title,
    path: icon.path,
    hex: icon.hex,
  };
}

/**
 * Ids catalogue (sous-catégories gaming + plateformes) → glyphe.
 * Approximation éditeur / plateforme uniquement quand le jeu n’a pas de glyphe dédié.
 * Nintendo / Xbox / Minecraft absents de Simple Icons → pictogrammes locaux.
 */
export const BRAND_ICONS: Record<string, BrandGlyph> = {
  // Jeux — glyphe Simple Icons dédié
  valorant: toGlyph(siValorant),
  lol: toGlyph(siLeagueoflegends),
  fortnite: toGlyph(siFortnite),
  cs2: toGlyph(siCounterstrike),
  roblox: toGlyph(siRoblox),
  fifa: toGlyph(siFifa),

  // Jeux — approximation éditeur / plateforme (SI)
  gta: toGlyph(siRockstargames),
  cod: toGlyph(siActivision),
  warzone: toGlyph(siActivision),
  wow: toGlyph(siBattledotnet),
  diablo: toGlyph(siBattledotnet),
  overwatch: toGlyph(siBattledotnet),
  genshin: toGlyph(siMihoyo),
  'rocket-league': toGlyph(siEpicgames),
  destiny: toGlyph(siBungie),
  apex: toGlyph(siEa),
  'it-takes-two': toGlyph(siEa),
  'indie-coop': toGlyph(siItchdotio),

  // Jeux — pictogrammes locaux (absents de SI)
  minecraft: LOCAL_MINECRAFT_CUBE,
  pokemon: LOCAL_NINTENDO_SWITCH,
  zelda: LOCAL_NINTENDO_SWITCH,
  smash: LOCAL_NINTENDO_SWITCH,

  // Alias / marques utiles
  riot: toGlyph(siRiotgames),
  valve: toGlyph(siValve),
  ea: toGlyph(siEa),
  steam: toGlyph(siSteam),
  epicgames: toGlyph(siEpicgames),
  ubisoft: toGlyph(siUbisoft),
  battledotnet: toGlyph(siBattledotnet),
  bungie: toGlyph(siBungie),
  origin: toGlyph(siOrigin),
  itch: toGlyph(siItchdotio),
  twitch: toGlyph(siTwitch),
  nintendo: LOCAL_NINTENDO_SWITCH,

  // Plateformes
  psn: toGlyph(siPlaystation),
  discord: toGlyph(siDiscord),
  /** PC gaming → Steam (pas de glyphe « PC » générique) */
  pc: toGlyph(siSteam),
  xbox: LOCAL_XBOX_PAD,
  switch: LOCAL_NINTENDO_SWITCH,
  /** Mobile → Android (OS le plus courant côté gaming mobile) */
  mobile: toGlyph(siAndroid),
};

/** Jeux / plateformes catalogue sans glyphe marque → Phosphor. */
export const BRAND_ICON_GAPS = [
  'among-us',
  'street-fighter',
  'tekken',
  'overcooked',
  'lethal-company',
  'phasmophobia',
  'stardew',
  'autre-jeu',
  'irl',
  'online',
] as const;

export function getBrandIcon(id: string | null | undefined): BrandGlyph | null {
  if (!id) return null;
  return BRAND_ICONS[id] ?? null;
}

export function hasBrandIcon(id: string | null | undefined): boolean {
  return getBrandIcon(id) != null;
}

/**
 * Fill marque lisible : noir/blanc purs (Fortnite, CS, Roblox…) → teinte fournie.
 */
export function readableBrandFill(hex: string, fallback: string): string {
  const raw = hex.replace('#', '').toLowerCase();
  const normalized =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw;
  if (normalized === '000000' || normalized === 'ffffff') {
    return fallback;
  }
  return `#${normalized}`;
}
