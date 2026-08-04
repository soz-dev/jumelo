/**
 * Artwork store / CDN pour les tuiles catalogue gaming.
 *
 * Préférence : jaquettes Steam (`library_600x900`) quand un AppID existe.
 * Hors Steam : icônes App Store (iTunes), médias officiels ou Wikimedia.
 * Voir LEGAL.md — hotlink MVP démo uniquement.
 */

export type GameArtSource = 'steam' | 'other';

export type GameArt = {
  imageUrl: string;
  source: GameArtSource;
  /** AppID Steam si source === 'steam' */
  steamAppId?: number;
};

const STEAM_CDN = 'https://cdn.cloudflare.steamstatic.com/steam/apps';

function steamLibrary(appId: number): GameArt {
  return {
    imageUrl: `${STEAM_CDN}/${appId}/library_600x900.jpg`,
    source: 'steam',
    steamAppId: appId,
  };
}

function other(imageUrl: string): GameArt {
  return { imageUrl, source: 'other' };
}

/**
 * Mapping id sous-catégorie gaming → artwork distant.
 * Absents → fallback Phosphor / glyphe jeu dédié (jamais logo éditeur).
 */
export const GAME_ART: Record<string, GameArt> = {
  // —— Steam ——
  cs2: steamLibrary(730),
  destiny: steamLibrary(1085660),
  'rocket-league': steamLibrary(252950),
  apex: steamLibrary(1172470),
  overwatch: steamLibrary(2357570),
  gta: steamLibrary(271590),
  /** Call of Duty®: Warzone™ */
  warzone: steamLibrary(1962663),
  /** Hub Call of Duty (Modern Warfare / BO / Warzone) */
  cod: steamLibrary(1938090),
  diablo: steamLibrary(2344520),
  wow: steamLibrary(1968840),
  'among-us': steamLibrary(945360),
  'it-takes-two': steamLibrary(1426210),
  'lethal-company': steamLibrary(1966720),
  phasmophobia: steamLibrary(739630),
  stardew: steamLibrary(413150),
  'street-fighter': steamLibrary(1364780),
  tekken: steamLibrary(1778820),
  /** EA SPORTS FC™ 25 (jaquette library dispo) */
  fifa: steamLibrary(2669320),
  overcooked: steamLibrary(728880),
  minecraft: steamLibrary(3049290),

  // —— Hors Steam (store / médias publics) ——
  /** Key art carré Riot CMS */
  valorant: other(
    'https://cmsassets.rgpub.io/sanity/images/dsfx7636/news/1d62a3751be9d7abfce84da8ca89be7d79f07fed-1232x1232.png?w=256&h=256&fit=crop',
  ),
  /** Icône App Store Wild Rift (marque LoL) */
  lol: other(
    'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/1a/50/14/1a501478-b78d-19d0-076f-fd0a4828b642/AppIcon-0-0-1x_U007emarketing-0-8-0-85-220.png/512x512bb.jpg',
  ),
  fortnite: other(
    'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/ae/c1/8f/aec18fd6-83cb-20a0-3937-e1c3d2f1260e/AppIcon-0-0-1x_U007epad-0-1-85-220.png/512x512bb.jpg',
  ),
  genshin: other(
    'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/fd/a5/bd/fda5bd6d-4ce5-9bd9-1b06-adc46757af8b/AppIcon-0-0-1x_U007epad-0-1-85-220.png/512x512bb.jpg',
  ),
  roblox: other(
    'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/96/84/da/9684da49-4027-e780-09e8-25d1dcc3950a/AppIcon-0-0-1x_U007epad-0-1-0-85-220.png/512x512bb.jpg',
  ),
  pokemon: other(
    'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/42/65/cb/4265cb35-5927-3d69-8860-dec5389ea2bb/AppIcon-0-0-1x_U007emarketing-0-8-0-85-220.png/512x512bb.jpg',
  ),
  zelda: other(
    'https://upload.wikimedia.org/wikipedia/en/f/fb/The_Legend_of_Zelda_Tears_of_the_Kingdom_cover.jpg',
  ),
  smash: other(
    'https://upload.wikimedia.org/wikipedia/en/5/50/Super_Smash_Bros._Ultimate.jpg',
  ),
};

export function getGameArt(catalogId: string | null | undefined): GameArt | null {
  if (!catalogId) return null;
  return GAME_ART[catalogId] ?? null;
}

export function hasGameArt(catalogId: string | null | undefined): boolean {
  return getGameArt(catalogId) != null;
}
