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
const pcMobileDiscord = platforms.filter((p) =>
  ['pc', 'mobile', 'discord'].includes(p.id),
);
const consolePlus = platforms.filter((p) =>
  ['pc', 'psn', 'xbox', 'switch', 'discord'].includes(p.id),
);
const irlOnly = platforms.filter((p) => p.id === 'irl');
const irlOnline = platforms.filter((p) => ['irl', 'online'].includes(p.id));
const irlOnlineDiscord = platforms.filter((p) =>
  ['irl', 'online', 'discord'].includes(p.id),
);
const onlineDiscord = platforms.filter((p) =>
  ['online', 'discord'].includes(p.id),
);

export const categories: Category[] = [
  {
    id: 'gaming',
    label: 'Jeux vidéo',
    shortLabel: 'Gaming',
    emoji: '🎮',
    description: 'Online, solo, compétitif ou chill',
    color: '#7C5CFC',
    subCategories: [
      { id: 'valorant', label: 'Valorant', emoji: '🔫', platforms: gamePlatforms },
      { id: 'lol', label: 'League of Legends', emoji: '⚔️', platforms: pcMobileDiscord },
      { id: 'cod', label: 'Call of Duty', emoji: '💥', platforms: gamePlatforms },
      { id: 'fortnite', label: 'Fortnite', emoji: '🏗️', platforms: gamePlatforms },
      { id: 'minecraft', label: 'Minecraft', emoji: '⛏️', platforms: gamePlatforms },
      { id: 'fifa', label: 'FIFA / EA FC', emoji: '⚽', platforms: gamePlatforms },
      { id: 'rocket-league', label: 'Rocket League', emoji: '🚗', platforms: gamePlatforms },
      { id: 'apex', label: 'Apex Legends', emoji: '🪂', platforms: gamePlatforms },
      { id: 'cs2', label: 'Counter-Strike 2', emoji: '🎯', platforms: pcDiscord },
      { id: 'overwatch', label: 'Overwatch 2', emoji: '🦸', platforms: consolePlus },
      { id: 'gta', label: 'GTA Online', emoji: '🚓', platforms: consolePlus },
      { id: 'warzone', label: 'Warzone', emoji: '🪖', platforms: gamePlatforms },
      { id: 'destiny', label: 'Destiny 2', emoji: '🌑', platforms: consolePlus },
      { id: 'diablo', label: 'Diablo', emoji: '😈', platforms: consolePlus },
      { id: 'wow', label: 'World of Warcraft', emoji: '🐉', platforms: pcDiscord },
      { id: 'genshin', label: 'Genshin Impact', emoji: '✨', platforms: pcMobileDiscord },
      { id: 'roblox', label: 'Roblox', emoji: '🧱', platforms: gamePlatforms },
      { id: 'among-us', label: 'Among Us', emoji: '🚨', platforms: gamePlatforms },
      { id: 'pokemon', label: 'Pokémon', emoji: '⚡', platforms: platforms.filter((p) => ['switch', 'mobile', 'discord'].includes(p.id)) },
      { id: 'zelda', label: 'Zelda', emoji: '🗡️', platforms: platforms.filter((p) => ['switch', 'discord'].includes(p.id)) },
      { id: 'street-fighter', label: 'Street Fighter', emoji: '👊', platforms: consolePlus },
      { id: 'tekken', label: 'Tekken', emoji: '🥋', platforms: consolePlus },
      { id: 'smash', label: 'Super Smash Bros', emoji: '💥', platforms: platforms.filter((p) => ['switch', 'discord'].includes(p.id)) },
      { id: 'overcooked', label: 'Overcooked', emoji: '🍲', platforms: consolePlus },
      { id: 'it-takes-two', label: 'It Takes Two', emoji: '🧩', platforms: consolePlus },
      { id: 'lethal-company', label: 'Lethal Company', emoji: '👻', platforms: pcDiscord },
      { id: 'phasmophobia', label: 'Phasmophobia', emoji: '🔦', platforms: pcDiscord },
      { id: 'stardew', label: 'Stardew Valley', emoji: '🌾', platforms: gamePlatforms },
      { id: 'indie-coop', label: 'Indie co-op', emoji: '🎲', platforms: gamePlatforms },
      { id: 'autre-jeu', label: 'Autre jeu', emoji: '🕹️', platforms: gamePlatforms },
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
      { id: 'football', label: 'Football', emoji: '⚽', platforms: irlOnline },
      { id: 'muscu', label: 'Musculation', emoji: '🏋️', platforms: irlOnly },
      { id: 'running', label: 'Running', emoji: '🏃', platforms: irlOnly },
      { id: 'basket', label: 'Basket', emoji: '🏀', platforms: irlOnly },
      { id: 'tennis', label: 'Tennis', emoji: '🎾', platforms: irlOnly },
      { id: 'padel', label: 'Padel', emoji: '🏸', platforms: irlOnly },
      { id: 'badminton', label: 'Badminton', emoji: '🏸', platforms: irlOnly },
      { id: 'volley', label: 'Volley', emoji: '🏐', platforms: irlOnly },
      { id: 'handball', label: 'Handball', emoji: '🤾', platforms: irlOnly },
      { id: 'rugby', label: 'Rugby', emoji: '🏉', platforms: irlOnly },
      { id: 'natation', label: 'Natation', emoji: '🏊', platforms: irlOnly },
      { id: 'velo', label: 'Vélo / cyclisme', emoji: '🚴', platforms: irlOnly },
      { id: 'randonnee', label: 'Randonnée', emoji: '🥾', platforms: irlOnly },
      { id: 'escalade', label: 'Escalade', emoji: '🧗', platforms: irlOnly },
      { id: 'yoga', label: 'Yoga', emoji: '🧘', platforms: irlOnline },
      { id: 'pilates', label: 'Pilates', emoji: '🤸', platforms: irlOnline },
      { id: 'crossfit', label: 'CrossFit', emoji: '💥', platforms: irlOnly },
      { id: 'boxe', label: 'Boxe', emoji: '🥊', platforms: irlOnly },
      { id: 'arts-martiaux', label: 'Arts martiaux', emoji: '🥋', platforms: irlOnly },
      { id: 'danse', label: 'Danse', emoji: '💃', platforms: irlOnline },
      { id: 'skate', label: 'Skate / roller', emoji: '🛹', platforms: irlOnly },
      { id: 'ski', label: 'Ski / snowboard', emoji: '⛷️', platforms: irlOnly },
      { id: 'golf', label: 'Golf', emoji: '⛳', platforms: irlOnly },
      { id: 'fitness', label: 'Fitness / HIIT', emoji: '🔥', platforms: irlOnline },
      { id: 'autre-sport', label: 'Autre sport', emoji: '🏅', platforms: irlOnline },
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
      { id: 'maths', label: 'Maths', emoji: '➗', platforms: irlOnlineDiscord },
      { id: 'anglais', label: 'Anglais', emoji: '🇬🇧', platforms: irlOnlineDiscord },
      { id: 'code', label: 'Code', emoji: '💻', platforms: irlOnlineDiscord },
      { id: 'design', label: 'Design', emoji: '🎨', platforms: irlOnlineDiscord },
      { id: 'prepa', label: 'Prépa', emoji: '📝', platforms: irlOnline },
      { id: 'langues', label: 'Langues', emoji: '🗣️', platforms: irlOnlineDiscord },
      { id: 'physique', label: 'Physique / chimie', emoji: '⚗️', platforms: irlOnlineDiscord },
      { id: 'eco', label: 'Éco / gestion', emoji: '📊', platforms: irlOnlineDiscord },
      { id: 'droit', label: 'Droit', emoji: '⚖️', platforms: irlOnlineDiscord },
      { id: 'medecine', label: 'Médecine / santé', emoji: '🩺', platforms: irlOnlineDiscord },
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
      { id: 'guitare', label: 'Guitare', emoji: '🎸', platforms: irlOnlineDiscord },
      { id: 'basse', label: 'Basse', emoji: '🎸', platforms: irlOnlineDiscord },
      { id: 'piano', label: 'Piano', emoji: '🎹', platforms: irlOnline },
      { id: 'batterie', label: 'Batterie', emoji: '🥁', platforms: irlOnly },
      { id: 'violon', label: 'Violon', emoji: '🎻', platforms: irlOnline },
      { id: 'ukulele', label: 'Ukulélé', emoji: '🪕', platforms: irlOnline },
      { id: 'saxophone', label: 'Saxophone', emoji: '🎷', platforms: irlOnly },
      { id: 'trompette', label: 'Trompette', emoji: '🎺', platforms: irlOnly },
      { id: 'flute', label: 'Flûte', emoji: '🎶', platforms: irlOnline },
      { id: 'synthe', label: 'Synthétiseur', emoji: '🎛️', platforms: irlOnlineDiscord },
      { id: 'chant', label: 'Chant', emoji: '🎤', platforms: irlOnline },
      { id: 'chorale', label: 'Chorale', emoji: '👥', platforms: irlOnly },
      { id: 'prod', label: 'Prod / DAW', emoji: '🎧', platforms: onlineDiscord },
      { id: 'composition', label: 'Composition', emoji: '🎼', platforms: irlOnlineDiscord },
      { id: 'dj', label: 'DJ', emoji: '🎚️', platforms: irlOnline },
      { id: 'beatbox', label: 'Beatbox', emoji: '🎙️', platforms: irlOnline },
      { id: 'jam', label: 'Jam session', emoji: '🎵', platforms: irlOnlineDiscord },
      { id: 'autre-musique', label: 'Autre instrument', emoji: '🎻', platforms: irlOnline },
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
      { id: 'lecture', label: 'Lecture', emoji: '📖', platforms: irlOnlineDiscord },
      { id: 'ecriture', label: 'Écriture', emoji: '✍️', platforms: irlOnlineDiscord },
      { id: 'musees', label: 'Musées', emoji: '🏛️', platforms: irlOnly },
      { id: 'histoire', label: 'Histoire', emoji: '📜', platforms: irlOnlineDiscord },
      { id: 'cinema', label: 'Cinéma', emoji: '🎬', platforms: irlOnline },
      { id: 'theatre', label: 'Théâtre', emoji: '🎭', platforms: irlOnly },
      { id: 'photo', label: 'Photo', emoji: '📷', platforms: irlOnline },
      { id: 'dessin', label: 'Dessin / art', emoji: '🎨', platforms: irlOnlineDiscord },
      { id: 'cuisine', label: 'Cuisine', emoji: '🍳', platforms: irlOnly },
      { id: 'jardinage', label: 'Jardinage', emoji: '🌱', platforms: irlOnly },
      { id: 'voyage', label: 'Voyage', emoji: '✈️', platforms: irlOnline },
      { id: 'board-games', label: 'Jeux de société', emoji: '🎲', platforms: irlOnline },
      { id: 'escape-game', label: 'Escape game', emoji: '🔐', platforms: irlOnly },
      { id: 'astronomie', label: 'Astronomie', emoji: '🔭', platforms: irlOnline },
      { id: 'bricolage', label: 'Bricolage / DIY', emoji: '🛠️', platforms: irlOnly },
      { id: 'couture', label: 'Couture', emoji: '🧵', platforms: irlOnline },
      { id: 'podcasts', label: 'Podcasts', emoji: '🎧', platforms: onlineDiscord },
      { id: 'benevolat', label: 'Bénévolat', emoji: '🤝', platforms: irlOnline },
      { id: 'startup', label: 'Startup / side-project', emoji: '🚀', platforms: irlOnlineDiscord },
      { id: 'autre-hobby', label: 'Autre hobby', emoji: '💫', platforms: irlOnline },
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
  // Gaming — compétitif
  valorant: ['competitif', 'casual', 'fun'],
  lol: ['competitif', 'casual', 'fun', 'serieux'],
  cod: ['competitif', 'casual', 'fun'],
  fortnite: ['competitif', 'casual', 'fun'],
  fifa: ['competitif', 'casual', 'fun'],
  'rocket-league': ['competitif', 'casual', 'fun'],
  apex: ['competitif', 'casual', 'fun'],
  cs2: ['competitif', 'casual', 'fun', 'serieux'],
  overwatch: ['competitif', 'casual', 'fun', 'social'],
  warzone: ['competitif', 'casual', 'fun'],
  'street-fighter': ['competitif', 'casual', 'fun', 'serieux'],
  tekken: ['competitif', 'casual', 'fun', 'serieux'],
  smash: ['competitif', 'casual', 'fun', 'social'],
  // Gaming — chill / créatif / coop
  minecraft: ['casual', 'fun', 'creatif', 'chill'],
  gta: ['casual', 'fun', 'social', 'chill'],
  destiny: ['competitif', 'casual', 'social', 'serieux'],
  diablo: ['casual', 'fun', 'competitif', 'chill'],
  wow: ['casual', 'social', 'serieux', 'fun'],
  genshin: ['casual', 'chill', 'fun', 'social'],
  roblox: ['casual', 'fun', 'creatif', 'social'],
  'among-us': ['fun', 'social', 'casual'],
  pokemon: ['casual', 'fun', 'chill', 'social'],
  zelda: ['casual', 'chill', 'fun'],
  overcooked: ['fun', 'social', 'casual'],
  'it-takes-two': ['fun', 'casual', 'chill', 'social'],
  'lethal-company': ['fun', 'social', 'casual'],
  phasmophobia: ['fun', 'social', 'casual', 'chill'],
  stardew: ['chill', 'casual', 'creatif', 'social'],
  'indie-coop': ['casual', 'fun', 'chill', 'social'],
  'autre-jeu': ['casual', 'fun', 'competitif', 'social'],
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
