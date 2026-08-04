/**
 * Mapping catalogue Jumelo → glyphes Simple Icons (CC0 SVG paths).
 *
 * Les marques restent propriété de leurs titulaires — voir LEGAL.md.
 * Absents de Simple Icons → fallback Phosphor via `Icon` (jamais d’emoji).
 */
import {
  siActivision,
  siBattledotnet,
  siCounterstrike,
  siDiscord,
  siEa,
  siEpicgames,
  siFifa,
  siFortnite,
  siLeagueoflegends,
  siMihoyo,
  siPlaystation,
  siRiotgames,
  siRoblox,
  siRockstargames,
  siSteam,
  siValorant,
  siValve,
  type SimpleIcon,
} from 'simple-icons';

export type BrandGlyph = {
  slug: string;
  title: string;
  path: string;
  /** Hex marque Simple Icons (sans #) */
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
 * Ids catalogue (sous-catégories gaming + plateformes) → Simple Icon.
 * Approximation éditeur uniquement quand le jeu n’a pas de glyphe dédié.
 */
export const BRAND_ICONS: Record<string, BrandGlyph> = {
  // Jeux — glyphe dédié
  valorant: toGlyph(siValorant),
  lol: toGlyph(siLeagueoflegends),
  fortnite: toGlyph(siFortnite),
  cs2: toGlyph(siCounterstrike),
  roblox: toGlyph(siRoblox),
  fifa: toGlyph(siFifa),

  // Jeux — approximation éditeur / plateforme (best-effort)
  gta: toGlyph(siRockstargames),
  cod: toGlyph(siActivision),
  warzone: toGlyph(siActivision),
  wow: toGlyph(siBattledotnet),
  diablo: toGlyph(siBattledotnet),
  overwatch: toGlyph(siBattledotnet),
  genshin: toGlyph(siMihoyo),
  'rocket-league': toGlyph(siEpicgames),

  // Alias / marques utiles
  riot: toGlyph(siRiotgames),
  valve: toGlyph(siValve),
  ea: toGlyph(siEa),
  steam: toGlyph(siSteam),

  // Plateformes
  psn: toGlyph(siPlaystation),
  discord: toGlyph(siDiscord),
  /** PC gaming → Steam (pas de glyphe « PC » générique) */
  pc: toGlyph(siSteam),
};

/** Jeux catalogue sans glyphe Simple Icons → Phosphor. */
export const BRAND_ICON_GAPS = [
  'minecraft',
  'apex',
  'destiny',
  'among-us',
  'pokemon',
  'zelda',
  'street-fighter',
  'tekken',
  'smash',
  'overcooked',
  'it-takes-two',
  'lethal-company',
  'phasmophobia',
  'stardew',
  'indie-coop',
  'autre-jeu',
  'xbox',
  'switch',
  'mobile',
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
