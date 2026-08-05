import type { PlatformId, UniverseId } from '../constants/catalog';
import type { Availability, Level, Vibe } from '../constants/catalog';
import type { ThemeId } from '../constants/theme';

export type UserProfile = {
  id: string;
  email: string;
  name: string;
  age?: number;
  city: string;
  bio: string;
  avatarColor: string;
  photo?: string;
  /** Avatar persona prédéfini (prioritaire après photo bibliothèque). */
  avatarPersonaId?: string;
  universes: UniverseId[];
  interests: string[];
  /** ex: valorant */
  subCategoryIds?: string[];
  platforms?: PlatformId[];
  level: Level;
  /** 1–3 vibes de jumelage (ids catalog). */
  vibes: Vibe[];
  availability: Availability[];
  objectives: string[];
  reliability: number;
  languages?: string[];
  online?: boolean;
  onboardingComplete: boolean;
  /** Préférence thème sync (optionnel, côté API) */
  themeId?: ThemeId;
  /** Premium (optionnel) — source de vérité MVP = AsyncStorage `@jumelo/premium-users` */
  isPremium?: boolean;
};

export const DEMO_EMAIL = 'lea@jumelo.app';

export const leaProfile: UserProfile = {
  id: 'u-lea',
  email: DEMO_EMAIL,
  name: 'Léa',
  age: 23,
  city: 'Lyon',
  bio: 'Valorant ranked le soir, muscu le matin. Toujours partante pour un jumelo chill.',
  avatarColor: '#0F8F8A',
  photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800',
  universes: ['gaming', 'sports'],
  interests: ['Valorant', 'Musculation', 'Apex Legends'],
  subCategoryIds: ['valorant', 'muscu', 'apex'],
  platforms: ['pc'],
  level: 'intermediaire',
  vibes: ['fun', 'casual'],
  availability: ['soir', 'week-end'],
  objectives: ['S’amuser', 'Trouver une team fixe'],
  reliability: 92,
  languages: ['Français'],
  online: true,
  onboardingComplete: true,
};

export const mockUsers: UserProfile[] = [
  leaProfile,
  {
    id: 'u-maxime',
    email: 'maxime@jumelo.app',
    name: 'Maxime',
    age: 26,
    city: 'Lyon',
    bio: 'Valorant ranked + muscu. Cherche un jumelo régulier le soir à Lyon.',
    avatarColor: '#F59E0B',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
    universes: ['gaming', 'sports'],
    interests: ['Valorant', 'Musculation', 'Apex Legends'],
    subCategoryIds: ['valorant', 'muscu', 'apex'],
    platforms: ['pc'],
    level: 'intermediaire',
    vibes: ['fun', 'casual'],
    availability: ['soir', 'week-end'],
    objectives: ['S’amuser', 'Trouver une team fixe'],
    reliability: 92,
    languages: ['Français', 'English'],
    online: false,
    onboardingComplete: true,
  },
  {
    id: 'u-sara',
    email: 'sara@jumelo.app',
    name: 'Sara',
    age: 22,
    city: 'Villeurbanne',
    bio: 'Prépa maths — cherche binôme sérieux pour révisions.',
    avatarColor: '#3B82F6',
    photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800',
    universes: ['education'],
    interests: ['Maths', 'Prépa'],
    subCategoryIds: ['maths', 'prepa'],
    platforms: ['online', 'irl'],
    level: 'avance',
    vibes: ['serieux', 'mentorat'],
    availability: ['matin', 'soir'],
    objectives: ['Progresser'],
    reliability: 95,
    languages: ['Français'],
    online: true,
    onboardingComplete: true,
  },
  {
    id: 'u-noah',
    email: 'noah@jumelo.app',
    name: 'Noah',
    age: 24,
    city: 'Lyon',
    bio: 'Main duelist Valorant, cherche un jumelo ranked régulier.',
    avatarColor: '#FF5A45',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800',
    universes: ['gaming'],
    interests: ['Valorant', 'Apex Legends'],
    subCategoryIds: ['valorant', 'apex'],
    platforms: ['pc'],
    level: 'avance',
    vibes: ['competitif', 'serieux'],
    availability: ['soir', 'week-end'],
    objectives: ['Progresser', 'Trouver une team fixe'],
    reliability: 88,
    languages: ['Français'],
    online: true,
    onboardingComplete: true,
  },
  {
    id: 'u-maya',
    email: 'maya@jumelo.app',
    name: 'Maya',
    age: 25,
    city: 'Lyon',
    bio: 'Foot, muscu et un peu de Valorant. Ambiance chill mais régulière.',
    avatarColor: '#1FA97A',
    photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800',
    universes: ['sports', 'gaming'],
    interests: ['Musculation', 'Valorant', 'Apex Legends'],
    subCategoryIds: ['muscu', 'valorant', 'apex'],
    platforms: ['pc', 'irl'],
    level: 'intermediaire',
    vibes: ['fun', 'chill', 'casual'],
    availability: ['soir', 'week-end'],
    objectives: ['S’amuser', 'Trouver une team fixe'],
    reliability: 93,
    languages: ['Français'],
    online: false,
    onboardingComplete: true,
  },
  {
    id: 'u-karim',
    email: 'karim@jumelo.app',
    name: 'Karim',
    age: 27,
    city: 'Lyon',
    bio: 'Captain Valorant Squad. Fair-play et coms clean.',
    avatarColor: '#7C5CFC',
    photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800',
    universes: ['gaming'],
    interests: ['Valorant'],
    subCategoryIds: ['valorant'],
    platforms: ['pc'],
    level: 'avance',
    vibes: ['competitif'],
    availability: ['soir'],
    objectives: ['Trouver une team fixe'],
    reliability: 90,
    languages: ['Français'],
    online: true,
    onboardingComplete: true,
  },
];

export type JoinRequestStatus = 'pending' | 'approved' | 'rejected';

export type TeamJoinRequest = {
  id: string;
  teamId: string;
  userId: string;
  status: JoinRequestStatus;
  createdAt: string;
  /** Snapshot affichage (Firebase / profil local) — optionnel pour les seeds. */
  userName?: string;
  avatarColor?: string;
  city?: string;
  photo?: string;
};

export type Team = {
  id: string;
  name: string;
  universe: UniverseId;
  activity: string;
  /** Id catalogue sous-catégorie (jeu / activité), si connu */
  subCategoryId?: string | null;
  /** Précisions CategoryPicker (plateforme, format, etc.) */
  activityDetails?: Record<string, string | number | boolean | null>;
  /** Chef de l’équipe — seul à approuver / exclure / dissoudre */
  ownerId: string;
  memberIds: string[];
  membersCount: number;
  capacity: number;
  city: string;
  levelLabel: string;
  vibe: string;
  nextSession: string;
  blurb: string;
  /**
   * true = entrée sur demande (chef Approuve/Refuse).
   * false = n’importe qui peut rejoindre directement.
   */
  locked: boolean;
};

export const mockTeams: Team[] = [
  {
    id: 't-valorant',
    name: 'Jumelo Valorant Lyon',
    universe: 'gaming',
    activity: 'Valorant ranked jumelo',
    ownerId: 'u-karim',
    memberIds: ['u-karim', 'u-lea'],
    membersCount: 2,
    capacity: 2,
    city: 'Lyon',
    levelLabel: 'avancé',
    vibe: 'competitif',
    nextSession: 'Ce soir · 21h',
    blurb: 'Binôme ranked, vibe competitive mais fair-play.',
    locked: true,
  },
  {
    id: 't-foot',
    name: 'Foot Mardi Soir',
    universe: 'sports',
    activity: 'Foot 5v5',
    ownerId: 'u-maya',
    memberIds: ['u-maya'],
    membersCount: 1,
    capacity: 10,
    city: 'Lyon 3e',
    levelLabel: 'tous niveaux',
    vibe: 'fun',
    nextSession: 'Mardi · 20h',
    blurb: 'Groupe optionnel — foot en salle, bonne humeur.',
    locked: true,
  },
  {
    id: 't-revisons',
    name: 'Jumelo révisions maths',
    universe: 'education',
    activity: 'Concours ingé',
    ownerId: 'u-sara',
    memberIds: ['u-sara'],
    membersCount: 1,
    capacity: 2,
    city: 'Online',
    levelLabel: 'intermédiaire',
    vibe: 'serieux',
    nextSession: 'Demain · 18h',
    blurb: 'Binôme révision maths / physique — slots 1/2.',
    locked: true,
  },
  {
    id: 't-funk',
    name: 'Jumelo Ranked Lyon',
    universe: 'gaming',
    activity: 'Valorant jumelo soir',
    ownerId: 'u-maxime',
    memberIds: ['u-maxime'],
    membersCount: 1,
    capacity: 2,
    city: 'Lyon',
    levelLabel: 'intermédiaire',
    vibe: 'fun',
    nextSession: 'Demain · 21h',
    blurb: 'Jumelo ranked chill, coms clean, pas de tilt — cherche 1 partenaire.',
    locked: false,
  },
  {
    id: 't-run',
    name: 'Jumelo Run Saône',
    universe: 'sports',
    activity: 'Running',
    ownerId: 'u-lea',
    memberIds: ['u-lea', 'u-maya'],
    membersCount: 2,
    capacity: 2,
    city: 'Lyon',
    levelLabel: 'débutant',
    vibe: 'fun',
    nextSession: 'Samedi · 10h',
    blurb: 'Binôme 10 km chill autour de la Saône — complet 2/2.',
    locked: false,
  },
];

/** Demandes de join seed (vide — créées en runtime). */
export const mockJoinRequests: TeamJoinRequest[] = [];

export type ChatThread = {
  id: string;
  peerId?: string;
  teamId?: string;
  name: string;
  isGroup?: boolean;
  preview: string;
  updatedAt: string;
  unread: number;
  /** Dernier message envoyé par moi (liste Messages). */
  lastFromMe?: boolean;
  /** « Vu » / « Envoyé » si lastFromMe. */
  readStatus?: 'vu' | 'envoye' | null;
  avatarLetter?: string;
  avatarColor?: string;
};

export const mockChats: ChatThread[] = [
  {
    id: 'c-lea',
    peerId: 'u-lea',
    name: 'Léa',
    preview: 'On lance la ranked ce soir ? 🎮',
    updatedAt: '12:32',
    unread: 2,
  },
  {
    id: 'c-maxime',
    peerId: 'u-maxime',
    name: 'Maxime',
    preview: 'Ranked ce soir, ça te dit ?',
    updatedAt: '11:08',
    unread: 1,
  },
  {
    id: 'c-valorant',
    teamId: 't-valorant',
    name: 'Valorant Squad · groupe',
    isGroup: true,
    preview: 'Karim: GG les gens 🔥',
    updatedAt: 'Hier',
    unread: 0,
    avatarLetter: 'V',
    avatarColor: '#A7F3D0',
  },
  {
    id: 'c-sara',
    peerId: 'u-sara',
    name: 'Sara',
    preview: 'On revoit les intégrales demain ?',
    updatedAt: 'Hier',
    unread: 0,
  },
  {
    id: 'c-funk',
    teamId: 't-funk',
    name: 'Jumelo Ranked Lyon · jumelo',
    isGroup: true,
    preview: 'Maxime: On lance une ranked ?',
    updatedAt: 'Lun',
    unread: 0,
    avatarLetter: 'J',
    avatarColor: '#A7F3D0',
  },
];

export type ChatMessage = {
  id: string;
  fromMe: boolean;
  text: string;
  at: string;
  /** Présent sur les messages de chat de groupe */
  senderName?: string;
};

export const mockMessages: Record<string, ChatMessage[]> = {
  'c-lea': [
    { id: 'm1', fromMe: false, text: "Salut ! J'ai vu qu'on match à 92% 🔥", at: '12:30' },
    { id: 'm2', fromMe: false, text: "T'es dispo ce soir pour une ranked Valorant ?", at: '12:30' },
    { id: 'm3', fromMe: true, text: 'Hey Léa ! Carrément, à partir de 21h ?', at: '12:31' },
    { id: 'm4', fromMe: false, text: 'Parfait, on lance la ranked ce soir ? 🎮', at: '12:32' },
  ],
  'c-maxime': [
    { id: 'm1', fromMe: false, text: 'Ranked ce soir, ça te dit ?', at: '11:08' },
  ],
  'c-sara': [
    { id: 'm1', fromMe: false, text: 'On revoit les intégrales demain ?', at: 'Hier' },
  ],
  'c-valorant': [
    { id: 'm1', fromMe: false, text: 'Karim: GG les gens 🔥', at: 'Hier' },
  ],
  'c-funk': [
    { id: 'm1', fromMe: false, text: 'Maxime: On lance une ranked ?', at: 'Lun' },
  ],
};

export const mockActivity = [
  { id: 'a1', text: 'Léa veut jumeler', time: 'il y a 2h', color: '#FF5A45' },
  { id: 'a2', text: 'Nouveau jumelage à 84% avec Maxime', time: 'il y a 5h', color: '#0F8F8A' },
  { id: 'a3', text: "Karim t'a invité dans une équipe", time: 'hier', color: '#7C5CFC' },
];
