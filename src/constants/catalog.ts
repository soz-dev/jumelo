export type UniverseId =
  | 'gaming'
  | 'sports'
  | 'education'
  | 'music'
  | 'hobbies';

export type Level = 'debutant' | 'intermediaire' | 'avance' | 'pro';
export type Vibe = 'chill' | 'competitif' | 'social' | 'serieux' | 'creatif' | 'fun' | 'casual' | 'mentorat';
export type Availability =
  | 'matin'
  | 'midi'
  | 'soir'
  | 'week-end'
  | 'flexible';

export type PlatformId =
  | 'pc'
  | 'psn'
  | 'xbox'
  | 'switch'
  | 'mobile'
  | 'discord'
  | 'irl'
  | 'online';

export type SubCategory = {
  id: string;
  label: string;
  emoji?: string;
  /** Sous-sous-catégories (ex. plateformes) */
  platforms?: { id: PlatformId; label: string; emoji: string }[];
};

export type Category = {
  id: UniverseId;
  label: string;
  shortLabel: string;
  emoji: string;
  description: string;
  color: string;
  subCategories: SubCategory[];
};

export const platforms: { id: PlatformId; label: string; emoji: string }[] = [
  { id: 'pc', label: 'PC', emoji: '💻' },
  { id: 'psn', label: 'PSN', emoji: '🎮' },
  { id: 'xbox', label: 'Xbox', emoji: '🟢' },
  { id: 'switch', label: 'Switch', emoji: '🔴' },
  { id: 'mobile', label: 'Mobile', emoji: '📱' },
  { id: 'discord', label: 'Discord', emoji: '💬' },
  { id: 'irl', label: 'En vrai', emoji: '📍' },
  { id: 'online', label: 'Online', emoji: '🌐' },
];

const gamePlatforms = platforms.filter((p) =>
  ['pc', 'psn', 'xbox', 'switch', 'mobile', 'discord'].includes(p.id),
);

const pcDiscord = platforms.filter((p) => ['pc', 'discord'].includes(p.id));
const mobileDiscord = platforms.filter((p) =>
  ['mobile', 'discord'].includes(p.id),
);
const consolePlus = platforms.filter((p) =>
  ['pc', 'psn', 'xbox', 'switch', 'discord'].includes(p.id),
);

export const categories: Category[] = [
  {
    id: 'gaming',
    label: 'Jeux vidéo',
    shortLabel: 'Gaming',
    emoji: '🎮',
    description: 'Online, solo, compétitif ou chill',
    color: '#7C5CFC',
    /** Top jeux les plus joués — catalogue volontairement court */
    subCategories: [
      { id: 'valorant', label: 'Valorant', emoji: '🔫', platforms: gamePlatforms },
      { id: 'lol', label: 'League of Legends', emoji: '⚔️', platforms: pcDiscord },
      {
        id: 'wild-rift',
        label: 'Wild Rift',
        emoji: '📱',
        platforms: mobileDiscord,
      },
      { id: 'cod', label: 'Call of Duty / Warzone', emoji: '💥', platforms: gamePlatforms },
      { id: 'fortnite', label: 'Fortnite', emoji: '🏗️', platforms: gamePlatforms },
      { id: 'minecraft', label: 'Minecraft', emoji: '⛏️', platforms: gamePlatforms },
      { id: 'fifa', label: 'FIFA / EA FC', emoji: '⚽', platforms: gamePlatforms },
      { id: 'rocket-league', label: 'Rocket League', emoji: '🚗', platforms: gamePlatforms },
      { id: 'apex', label: 'Apex Legends', emoji: '🪂', platforms: gamePlatforms },
      { id: 'cs2', label: 'Counter-Strike 2', emoji: '🎯', platforms: pcDiscord },
      { id: 'gta', label: 'GTA Online', emoji: '🚓', platforms: consolePlus },
    ],
  },
  {
    id: 'sports',
    label: 'Sports & fitness',
    shortLabel: 'Sport',
    emoji: '💪',
    description: 'Foot, muscu, running et plus',
    color: '#0F8F8A',
    subCategories: [
      { id: 'football', label: 'Football', emoji: '⚽' },
      { id: 'muscu', label: 'Musculation', emoji: '🏋️' },
      { id: 'running', label: 'Running', emoji: '🏃' },
      { id: 'basket', label: 'Basket', emoji: '🏀' },
      { id: 'tennis', label: 'Tennis', emoji: '🎾' },
      { id: 'padel', label: 'Padel', emoji: '🏸' },
      { id: 'badminton', label: 'Badminton', emoji: '🏸' },
      { id: 'volley', label: 'Volley', emoji: '🏐' },
      { id: 'handball', label: 'Handball', emoji: '🤾' },
      { id: 'rugby', label: 'Rugby', emoji: '🏉' },
      { id: 'natation', label: 'Natation', emoji: '🏊' },
      { id: 'velo', label: 'Vélo / cyclisme', emoji: '🚴' },
      { id: 'randonnee', label: 'Randonnée', emoji: '🥾' },
      { id: 'escalade', label: 'Escalade', emoji: '🧗' },
      { id: 'yoga', label: 'Yoga', emoji: '🧘' },
      { id: 'pilates', label: 'Pilates', emoji: '🤸' },
      { id: 'crossfit', label: 'CrossFit', emoji: '💥' },
      { id: 'boxe', label: 'Boxe', emoji: '🥊' },
      { id: 'arts-martiaux', label: 'Arts martiaux', emoji: '🥋' },
      { id: 'danse', label: 'Danse', emoji: '💃' },
      { id: 'skate', label: 'Skate / roller', emoji: '🛹' },
      { id: 'ski', label: 'Ski / snowboard', emoji: '⛷️' },
      { id: 'golf', label: 'Golf', emoji: '⛳' },
      { id: 'fitness', label: 'Fitness / HIIT', emoji: '🔥' },
      { id: 'autre-sport', label: 'Autre sport', emoji: '🏅' },
    ],
  },
  {
    id: 'education',
    label: 'Éducation',
    shortLabel: 'Études',
    emoji: '📚',
    description: 'Études, langues, révision',
    color: '#3B82F6',
    subCategories: [
      { id: 'maths', label: 'Maths', emoji: '➗' },
      { id: 'anglais', label: 'Anglais', emoji: '🇬🇧' },
      { id: 'code', label: 'Code', emoji: '💻' },
      { id: 'design', label: 'Design', emoji: '🎨' },
      { id: 'prepa', label: 'Prépa', emoji: '📝' },
      { id: 'langues', label: 'Langues', emoji: '🗣️' },
      { id: 'physique', label: 'Physique / chimie', emoji: '⚗️' },
      { id: 'eco', label: 'Éco / gestion', emoji: '📊' },
      { id: 'droit', label: 'Droit', emoji: '⚖️' },
      { id: 'medecine', label: 'Médecine / santé', emoji: '🩺' },
    ],
  },
  {
    id: 'music',
    label: 'Musique',
    shortLabel: 'Musique',
    emoji: '🎸',
    description: 'Jam, instruments, prod, chorale',
    color: '#F59E0B',
    subCategories: [
      { id: 'guitare', label: 'Guitare', emoji: '🎸' },
      { id: 'basse', label: 'Basse', emoji: '🎸' },
      { id: 'piano', label: 'Piano', emoji: '🎹' },
      { id: 'batterie', label: 'Batterie', emoji: '🥁' },
      { id: 'violon', label: 'Violon', emoji: '🎻' },
      { id: 'ukulele', label: 'Ukulélé', emoji: '🪕' },
      { id: 'saxophone', label: 'Saxophone', emoji: '🎷' },
      { id: 'trompette', label: 'Trompette', emoji: '🎺' },
      { id: 'flute', label: 'Flûte', emoji: '🎶' },
      { id: 'synthe', label: 'Synthétiseur', emoji: '🎛️' },
      { id: 'chant', label: 'Chant', emoji: '🎤' },
      { id: 'chorale', label: 'Chorale', emoji: '👥' },
      { id: 'prod', label: 'Prod / DAW', emoji: '🎧' },
      { id: 'composition', label: 'Composition', emoji: '🎼' },
      { id: 'dj', label: 'DJ', emoji: '🎚️' },
      { id: 'beatbox', label: 'Beatbox', emoji: '🎙️' },
      { id: 'jam', label: 'Jam session', emoji: '🎵' },
      { id: 'autre-musique', label: 'Autre instrument', emoji: '🎻' },
    ],
  },
  {
    id: 'hobbies',
    label: 'Hobbies & culture',
    shortLabel: 'Culture',
    emoji: '✨',
    description: 'Créa, culture, passions & sorties',
    color: '#EC4899',
    subCategories: [
      { id: 'lecture', label: 'Lecture', emoji: '📖' },
      { id: 'ecriture', label: 'Écriture', emoji: '✍️' },
      { id: 'musees', label: 'Musées', emoji: '🏛️' },
      { id: 'histoire', label: 'Histoire', emoji: '📜' },
      { id: 'cinema', label: 'Cinéma', emoji: '🎬' },
      { id: 'theatre', label: 'Théâtre', emoji: '🎭' },
      { id: 'photo', label: 'Photo', emoji: '📷' },
      { id: 'dessin', label: 'Dessin / art', emoji: '🎨' },
      { id: 'cuisine', label: 'Cuisine', emoji: '🍳' },
      { id: 'jardinage', label: 'Jardinage', emoji: '🌱' },
      { id: 'voyage', label: 'Voyage', emoji: '✈️' },
      { id: 'board-games', label: 'Jeux de société', emoji: '🎲' },
      { id: 'escape-game', label: 'Escape game', emoji: '🔐' },
      { id: 'astronomie', label: 'Astronomie', emoji: '🔭' },
      { id: 'bricolage', label: 'Bricolage / DIY', emoji: '🛠️' },
      { id: 'couture', label: 'Couture', emoji: '🧵' },
      { id: 'podcasts', label: 'Podcasts', emoji: '🎧' },
      { id: 'benevolat', label: 'Bénévolat', emoji: '🤝' },
      { id: 'startup', label: 'Startup / side-project', emoji: '🚀' },
      { id: 'autre-hobby', label: 'Autre hobby', emoji: '💫' },
    ],
  },
];

/** Alias rétrocompat */
export const universes = categories.map((c) => ({
  id: c.id,
  label: c.label,
  emoji: c.emoji,
  description: c.description,
}));

export const interestCatalog: Record<UniverseId, string[]> = Object.fromEntries(
  categories.map((c) => [c.id, c.subCategories.map((s) => s.label)]),
) as Record<UniverseId, string[]>;

export function getCategory(id: UniverseId) {
  return categories.find((c) => c.id === id);
}

export function getSubCategory(universeId: UniverseId, subId: string) {
  return getCategory(universeId)?.subCategories.find((s) => s.id === subId);
}

export type CatalogInterestMatch = {
  id: string;
  label: string;
  universeId: UniverseId;
};

/** Résout un intérêt profil (label ou id) vers une sous-catégorie catalogue. */
export function findInterestInCatalog(
  interest: string,
): CatalogInterestMatch | null {
  const n = interest.trim().toLowerCase();
  if (!n) return null;
  for (const cat of categories) {
    const sub = cat.subCategories.find(
      (s) => s.id.toLowerCase() === n || s.label.toLowerCase() === n,
    );
    if (sub) {
      return { id: sub.id, label: sub.label, universeId: cat.id };
    }
  }
  return null;
}

/** Alias courts / familiers → id sous-catégorie (matching texte libre équipes). */
const CATALOG_TEXT_ALIASES: Record<string, string[]> = {
  football: ['foot', 'soccer'],
  valorant: ['valo'],
  lol: ['league', 'league of legends'],
  'wild-rift': ['wild rift', 'wr'],
  cod: ['warzone', 'call of duty'],
  fifa: ['ea fc', 'fc 25', 'fc25'],
  muscu: ['musculation', 'salle'],
  'rocket-league': ['rocket league', 'rl'],
  cs2: ['counter-strike', 'csgo', 'cs:go'],
  prepa: ['concours', 'inge', 'ingé'],
};

function catalogNeedleMatches(haystack: string, needle: string): boolean {
  const n = needle.trim().toLowerCase();
  if (!n || !haystack.includes(n)) return false;
  // Ids très courts : exiger une borne (évite « art » dans un mot).
  if (n.length <= 2) {
    return new RegExp(`(^|[^a-z0-9])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`).test(
      haystack,
    );
  }
  return true;
}

/**
 * Résout une sous-catégorie depuis un texte libre (nom + activité d’équipe).
 * Préfère l’univers fourni et le libellé / alias le plus long.
 */
export function findCatalogInText(
  text: string,
  universeId?: UniverseId | null,
): CatalogInterestMatch | null {
  const exact = findInterestInCatalog(text);
  if (exact && (!universeId || exact.universeId === universeId)) return exact;

  const hay = text.trim().toLowerCase();
  if (!hay) return null;

  const cats = universeId
    ? categories.filter((c) => c.id === universeId)
    : categories;

  let best: CatalogInterestMatch | null = null;
  let bestLen = 0;

  for (const cat of cats) {
    for (const sub of cat.subCategories) {
      const needles = [
        sub.id,
        sub.label,
        ...(CATALOG_TEXT_ALIASES[sub.id] ?? []),
      ];
      for (const needle of needles) {
        const len = needle.trim().length;
        if (len < bestLen) continue;
        if (!catalogNeedleMatches(hay, needle)) continue;
        best = { id: sub.id, label: sub.label, universeId: cat.id };
        bestLen = len;
      }
    }
  }
  return best;
}

export const levels: { id: Level; label: string }[] = [
  { id: 'debutant', label: 'Débutant' },
  { id: 'intermediaire', label: 'Intermédiaire' },
  { id: 'avance', label: 'Avancé' },
  { id: 'pro', label: 'Pro / élite' },
];

export type VibeOption = {
  id: Vibe;
  label: string;
  hint: string;
  /** Nom sémantique Phosphor (`IconName`) */
  icon: Vibe;
};

export const vibes: VibeOption[] = [
  { id: 'competitif', label: 'Compétitif', hint: 'On vise la perf', icon: 'competitif' },
  { id: 'casual', label: 'Casual', hint: 'Sans pression', icon: 'casual' },
  { id: 'serieux', label: 'Sérieux', hint: 'Régulier et fiable', icon: 'serieux' },
  { id: 'fun', label: 'Fun', hint: 'Pour le fun', icon: 'fun' },
  { id: 'mentorat', label: 'Mentorat', hint: 'Apprendre ensemble', icon: 'mentorat' },
  { id: 'chill', label: 'Chill', hint: 'Sans pression, pour le fun', icon: 'chill' },
  { id: 'social', label: 'Social', hint: 'Rencontres & bonne ambiance', icon: 'social' },
  { id: 'creatif', label: 'Créatif', hint: 'Explorer et créer ensemble', icon: 'creatif' },
];

const vibeById = Object.fromEntries(vibes.map((v) => [v.id, v])) as Record<Vibe, VibeOption>;

/** Vibes par défaut selon l’univers */
export const vibesByUniverse: Record<UniverseId, Vibe[]> = {
  gaming: ['competitif', 'casual', 'fun', 'serieux', 'mentorat'],
  sports: ['competitif', 'chill', 'casual', 'fun', 'serieux'],
  education: ['serieux', 'mentorat', 'casual', 'social'],
  music: ['creatif', 'casual', 'fun', 'serieux'],
  hobbies: ['chill', 'casual', 'social', 'creatif', 'fun'],
};

/**
 * Overrides par sous-catégorie (id → vibes).
 * Ex. cuisine n’a pas « compétitif » ; Valorant reste orienté ranked.
 */
export const vibesBySubCategory: Partial<Record<string, Vibe[]>> = {
  // Gaming (top 10)
  valorant: ['competitif', 'casual', 'fun'],
  lol: ['competitif', 'casual', 'fun', 'serieux'],
  'wild-rift': ['competitif', 'casual', 'fun', 'serieux'],
  cod: ['competitif', 'casual', 'fun'],
  fortnite: ['competitif', 'casual', 'fun'],
  fifa: ['competitif', 'casual', 'fun'],
  'rocket-league': ['competitif', 'casual', 'fun'],
  apex: ['competitif', 'casual', 'fun'],
  cs2: ['competitif', 'casual', 'fun', 'serieux'],
  minecraft: ['casual', 'fun', 'creatif', 'chill'],
  gta: ['casual', 'fun', 'social', 'chill'],
  // Sports
  yoga: ['chill', 'casual', 'serieux'],
  pilates: ['chill', 'casual', 'serieux'],
  muscu: ['serieux', 'casual', 'competitif', 'mentorat'],
  running: ['casual', 'competitif', 'serieux', 'chill'],
  crossfit: ['competitif', 'serieux', 'fun'],
  fitness: ['serieux', 'casual', 'fun', 'competitif'],
  football: ['competitif', 'fun', 'social', 'casual'],
  basket: ['competitif', 'fun', 'social', 'casual'],
  tennis: ['competitif', 'casual', 'serieux', 'fun'],
  padel: ['fun', 'social', 'casual', 'competitif'],
  badminton: ['fun', 'casual', 'competitif', 'social'],
  volley: ['fun', 'social', 'casual', 'competitif'],
  handball: ['competitif', 'fun', 'social'],
  rugby: ['competitif', 'fun', 'social', 'serieux'],
  natation: ['serieux', 'casual', 'chill'],
  velo: ['casual', 'serieux', 'chill', 'social'],
  randonnee: ['chill', 'social', 'casual'],
  escalade: ['serieux', 'fun', 'social', 'casual'],
  boxe: ['competitif', 'serieux', 'fun', 'mentorat'],
  'arts-martiaux': ['serieux', 'competitif', 'mentorat', 'casual'],
  danse: ['fun', 'creatif', 'social', 'casual'],
  skate: ['fun', 'casual', 'social', 'chill'],
  ski: ['fun', 'social', 'casual', 'competitif'],
  golf: ['casual', 'serieux', 'chill', 'social'],
  'autre-sport': ['casual', 'fun', 'social', 'competitif'],
  // Éducation
  maths: ['serieux', 'mentorat'],
  anglais: ['serieux', 'mentorat', 'casual', 'social'],
  code: ['serieux', 'mentorat', 'casual'],
  design: ['creatif', 'serieux', 'mentorat', 'casual'],
  prepa: ['serieux', 'mentorat'],
  langues: ['serieux', 'mentorat', 'casual', 'social'],
  physique: ['serieux', 'mentorat', 'casual'],
  eco: ['serieux', 'mentorat', 'casual'],
  droit: ['serieux', 'mentorat'],
  medecine: ['serieux', 'mentorat'],
  // Musique
  guitare: ['creatif', 'casual', 'fun', 'serieux'],
  basse: ['creatif', 'casual', 'fun', 'serieux'],
  piano: ['creatif', 'serieux', 'casual', 'mentorat'],
  batterie: ['creatif', 'fun', 'casual'],
  violon: ['creatif', 'serieux', 'mentorat', 'casual'],
  ukulele: ['casual', 'fun', 'creatif', 'chill'],
  saxophone: ['creatif', 'fun', 'serieux'],
  trompette: ['creatif', 'fun', 'serieux'],
  flute: ['creatif', 'serieux', 'casual'],
  synthe: ['creatif', 'fun', 'casual'],
  prod: ['creatif', 'serieux', 'casual'],
  composition: ['creatif', 'serieux', 'casual'],
  dj: ['creatif', 'fun', 'casual'],
  chant: ['creatif', 'fun', 'serieux', 'casual'],
  chorale: ['social', 'creatif', 'fun', 'serieux'],
  beatbox: ['fun', 'creatif', 'casual'],
  jam: ['fun', 'creatif', 'social', 'casual'],
  'autre-musique': ['creatif', 'casual', 'fun', 'serieux'],
  // Hobbies & culture
  lecture: ['chill', 'social', 'casual', 'creatif'],
  ecriture: ['creatif', 'serieux', 'chill', 'casual'],
  musees: ['chill', 'social', 'creatif', 'casual'],
  histoire: ['serieux', 'social', 'chill', 'casual'],
  cinema: ['chill', 'social', 'fun', 'casual'],
  theatre: ['creatif', 'social', 'fun', 'serieux'],
  photo: ['creatif', 'chill', 'social', 'casual'],
  dessin: ['creatif', 'chill', 'casual', 'serieux'],
  cuisine: ['chill', 'social', 'creatif'],
  jardinage: ['chill', 'casual', 'creatif', 'social'],
  voyage: ['social', 'fun', 'chill', 'casual'],
  'board-games': ['fun', 'social', 'chill', 'casual'],
  'escape-game': ['fun', 'social', 'casual'],
  astronomie: ['chill', 'serieux', 'social', 'casual'],
  bricolage: ['creatif', 'casual', 'serieux'],
  couture: ['creatif', 'chill', 'casual'],
  podcasts: ['chill', 'social', 'creatif', 'casual'],
  benevolat: ['social', 'serieux', 'chill'],
  startup: ['serieux', 'creatif', 'social', 'mentorat'],
  'autre-hobby': ['chill', 'casual', 'social', 'creatif', 'fun'],
};

function resolveVibeIds(universeId: UniverseId, subCategoryId?: string | null): Vibe[] {
  if (subCategoryId && vibesBySubCategory[subCategoryId]) {
    return vibesBySubCategory[subCategoryId]!;
  }
  return vibesByUniverse[universeId] ?? vibesByUniverse.hobbies;
}

/** Vibes pertinentes pour un univers (+ sous-catégorie optionnelle) */
export function getVibesForContext(
  universeId: UniverseId,
  subCategoryId?: string | null,
): VibeOption[] {
  return resolveVibeIds(universeId, subCategoryId).map((id) => vibeById[id]);
}

/**
 * Union des vibes pour plusieurs univers (onboarding).
 * Si aucun univers, renvoie toutes les vibes.
 */
export function getVibesForUniverses(universeIds: UniverseId[]): VibeOption[] {
  if (!universeIds.length) return vibes;
  const seen = new Set<Vibe>();
  const result: VibeOption[] = [];
  for (const id of universeIds) {
    for (const vibe of getVibesForContext(id)) {
      if (!seen.has(vibe.id)) {
        seen.add(vibe.id);
        result.push(vibe);
      }
    }
  }
  return result;
}

export const availabilities: { id: Availability; label: string }[] = [
  { id: 'matin', label: 'Matin' },
  { id: 'midi', label: 'Midi' },
  { id: 'soir', label: 'Soir' },
  { id: 'week-end', label: 'Week-end' },
  { id: 'flexible', label: 'Flexible' },
];

export const objectives = [
  'Progresser',
  'S’amuser',
  'Trouver une team fixe',
  'Préparer un événement',
  'Rester motivé',
  'Réseauter',
];
