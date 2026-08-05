/**
 * Mapping catalogue Jumelo → glyphes marque (Simple Icons CC0 + pictogrammes locaux).
 *
 * Règle produit : SI éditeur (miHoYo, Activision, Rockstar, Battle.net…) JAMAIS
 * en stand-in d’un jeu précis. SI / local OK pour :
 * - plateformes (Steam, PSN, Xbox, Switch, Discord, Mobile…)
 * - logos JEU dédiés (Valorant, LoL, Fortnite, CS, Roblox, FIFA) en fallback
 *   quand `gameArt.ts` n’a pas d’URL ou que l’image échoue.
 *
 * Voir LEGAL.md. Absents → Phosphor via `Icon`.
 */
import {
  siAndroid,
  siCounterstrike,
  siDiscord,
  siEa,
  siEpicgames,
  siFifa,
  siFortnite,
  siItchdotio,
  siLeagueoflegends,
  siOrigin,
  siPlaystation,
  siRiotgames,
  siRoblox,
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
 * Ids catalogue → glyphe.
 * Jeux : uniquement logos JEU dédiés (pas d’éditeur).
 * Plateformes / alias marques : SI + locaux.
 */
export const BRAND_ICONS: Record<string, BrandGlyph> = {
  // Jeux — glyphe Simple Icons dédié (fallback si pas d’artwork)
  valorant: toGlyph(siValorant),
  lol: toGlyph(siLeagueoflegends),
  /** Même marque LoL — artwork distinct via gameArt */
  'wild-rift': toGlyph(siLeagueoflegends),
  fortnite: toGlyph(siFortnite),
  cs2: toGlyph(siCounterstrike),
  roblox: toGlyph(siRoblox),
  fifa: toGlyph(siFifa),

  // Jeux — pictogramme local (pas un logo éditeur)
  minecraft: LOCAL_MINECRAFT_CUBE,

  // Alias / marques utiles (pas des tuiles jeu)
  riot: toGlyph(siRiotgames),
  valve: toGlyph(siValve),
  ea: toGlyph(siEa),
  steam: toGlyph(siSteam),
  epicgames: toGlyph(siEpicgames),
  ubisoft: toGlyph(siUbisoft),
  origin: toGlyph(siOrigin),
  itch: toGlyph(siItchdotio),
  twitch: toGlyph(siTwitch),
  nintendo: LOCAL_NINTENDO_SWITCH,

  // Plateformes
  psn: toGlyph(siPlaystation),
  discord: toGlyph(siDiscord),
  /** PC gaming → Steam */
  pc: toGlyph(siSteam),
  xbox: LOCAL_XBOX_PAD,
  switch: LOCAL_NINTENDO_SWITCH,
  /** Mobile → Android */
  mobile: toGlyph(siAndroid),
};

/** Jeux catalogue sans glyphe marque dédié → Phosphor (artwork via gameArt si dispo). */
export const BRAND_ICON_GAPS = [
  'cod',
  'warzone',
  'gta',
  'wow',
  'diablo',
  'overwatch',
  'genshin',
  'rocket-league',
  'destiny',
  'apex',
  'it-takes-two',
  'indie-coop',
  'among-us',
  'street-fighter',
  'tekken',
  'overcooked',
  'lethal-company',
  'phasmophobia',
  'stardew',
  'pokemon',
  'zelda',
  'smash',
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
