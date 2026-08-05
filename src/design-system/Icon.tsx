/**
 * Icônes Jumelo — Phosphor (MIT) + glyphes marque Simple Icons (CC0) quand mappés.
 * Pas d’emoji dans l’UI produit. Marques : voir LEGAL.md.
 */
import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import {
  type Icon as PhosphorIcon,
  type IconWeight,
  AirplaneTilt,
  Barbell,
  Basketball,
  Bicycle,
  Binoculars,
  BookOpen,
  Books,
  BoxingGlove,
  Broadcast,
  Building,
  Calculator,
  CalendarBlank,
  Camera,
  Car,
  CaretRight,
  ChartBar,
  ChatCircle,
  CheckCircle,
  Clock,
  Code,
  Compass,
  CookingPot,
  Crosshair,
  Cube,
  Desktop,
  DeviceMobile,
  DiceSix,
  Disc,
  Drop,
  Eye,
  FilmSlate,
  FirstAid,
  Flame,
  Flashlight,
  FlowerLotus,
  Football,
  GameController,
  Ghost,
  GitDiff,
  GlobeHemisphereWest,
  Golf,
  Guitar,
  HandFist,
  Handshake,
  Headphones,
  Heart,
  House,
  Joystick,
  Lightning,
  LockKey,
  LockKeyOpen,
  MagicWand,
  MagnifyingGlass,
  MapPin,
  Plus,
  MaskHappy,
  Microphone,
  Moon,
  Mountains,
  MusicNote,
  MusicNotes,
  Needle,
  PaintBrush,
  Palette,
  PenNib,
  PersonSimpleHike,
  PersonSimpleRun,
  PersonSimpleSwim,
  PianoKeys,
  Plant,
  Pulse,
  PuzzlePiece,
  Rocket,
  Scales,
  Smiley,
  SoccerBall,
  Sparkle,
  SpeakerHigh,
  Star,
  Sun,
  SunHorizon,
  Sword,
  Target,
  TennisBall,
  Translate,
  TreasureChest,
  TreeEvergreen,
  Trophy,
  UserCircle,
  Users,
  UsersThree,
  Volleyball,
  Waveform,
} from 'phosphor-react-native';

import type { Availability, PlatformId, UniverseId, Vibe } from '../constants/catalog';
import { getBrandIcon, readableBrandFill } from '../constants/gameIcons';
import { BrandIcon } from './BrandIcon';

export type IconName =
  | UniverseId
  | PlatformId
  | Availability
  | Vibe
  // Navigation / chrome
  | 'home'
  | 'discover'
  | 'teams'
  | 'chat'
  | 'profile'
  | 'common'
  | 'language'
  | 'check'
  | 'chevronRight'
  | 'eye'
  | 'heart'
  | 'spark'
  | 'live'
  | 'pulse'
  | 'city'
  | 'interest'
  | 'lock'
  | 'lock-open'
  | 'plus'
  | 'search'
  // Activités (sous-catégories + alias sémantiques)
  | 'sport'
  | 'football'
  | 'muscu'
  | 'running'
  | 'basket'
  | 'tennis'
  | 'padel'
  | 'badminton'
  | 'volley'
  | 'handball'
  | 'rugby'
  | 'natation'
  | 'velo'
  | 'randonnee'
  | 'escalade'
  | 'yoga'
  | 'pilates'
  | 'crossfit'
  | 'boxe'
  | 'arts-martiaux'
  | 'danse'
  | 'skate'
  | 'ski'
  | 'golf'
  | 'fitness'
  | 'autre-sport'
  | 'studies'
  | 'evening'
  | 'morning'
  | 'noon'
  | 'weekend'
  | 'flexible'
  | 'vibe'
  // Gaming
  | 'valorant'
  | 'lol'
  | 'wild-rift'
  | 'cod'
  | 'fortnite'
  | 'minecraft'
  | 'fifa'
  | 'rocket-league'
  | 'apex'
  | 'cs2'
  | 'overwatch'
  | 'gta'
  | 'warzone'
  | 'destiny'
  | 'diablo'
  | 'wow'
  | 'genshin'
  | 'roblox'
  | 'among-us'
  | 'pokemon'
  | 'zelda'
  | 'street-fighter'
  | 'tekken'
  | 'smash'
  | 'overcooked'
  | 'it-takes-two'
  | 'lethal-company'
  | 'phasmophobia'
  | 'stardew'
  | 'indie-coop'
  | 'autre-jeu'
  // Education
  | 'maths'
  | 'anglais'
  | 'code'
  | 'design'
  | 'prepa'
  | 'langues'
  | 'physique'
  | 'eco'
  | 'droit'
  | 'medecine'
  // Music
  | 'guitare'
  | 'basse'
  | 'piano'
  | 'batterie'
  | 'violon'
  | 'ukulele'
  | 'saxophone'
  | 'trompette'
  | 'flute'
  | 'synthe'
  | 'chant'
  | 'chorale'
  | 'prod'
  | 'composition'
  | 'dj'
  | 'beatbox'
  | 'jam'
  | 'autre-musique'
  // Hobbies
  | 'lecture'
  | 'ecriture'
  | 'musees'
  | 'histoire'
  | 'cinema'
  | 'theatre'
  | 'photo'
  | 'dessin'
  | 'cuisine'
  | 'jardinage'
  | 'voyage'
  | 'board-games'
  | 'escape-game'
  | 'astronomie'
  | 'bricolage'
  | 'couture'
  | 'podcasts'
  | 'benevolat'
  | 'startup'
  | 'autre-hobby';

const ICONS: Record<IconName, PhosphorIcon> = {
  // Univers
  gaming: GameController,
  sports: Barbell,
  education: BookOpen,
  music: MusicNotes,
  hobbies: Sparkle,
  sport: Barbell,
  studies: BookOpen,

  // Plateformes
  pc: Desktop,
  psn: GameController,
  xbox: GameController,
  switch: DeviceMobile,
  mobile: DeviceMobile,
  discord: ChatCircle,
  irl: MapPin,
  online: GlobeHemisphereWest,

  // Dispos
  matin: SunHorizon,
  midi: Sun,
  soir: Moon,
  'week-end': CalendarBlank,
  flexible: Clock,
  morning: SunHorizon,
  noon: Sun,
  evening: Moon,
  weekend: CalendarBlank,

  // Vibes
  competitif: Flame,
  casual: Sun,
  serieux: Target,
  fun: Smiley,
  mentorat: Users,
  chill: Drop,
  social: UsersThree,
  creatif: MagicWand,
  vibe: Smiley,

  // Nav
  home: House,
  discover: Compass,
  teams: UsersThree,
  chat: ChatCircle,
  profile: UserCircle,
  common: GitDiff,
  language: Translate,
  check: CheckCircle,
  chevronRight: CaretRight,
  eye: Eye,
  heart: Heart,
  spark: Sparkle,
  live: Broadcast,
  pulse: Pulse,
  city: MapPin,
  interest: Star,
  lock: LockKey,
  'lock-open': LockKeyOpen,
  plus: Plus,
  search: MagnifyingGlass,

  // Sport
  football: SoccerBall,
  muscu: Barbell,
  running: PersonSimpleRun,
  basket: Basketball,
  tennis: TennisBall,
  padel: TennisBall,
  badminton: TennisBall,
  volley: Volleyball,
  handball: Basketball,
  rugby: Football,
  natation: PersonSimpleSwim,
  velo: Bicycle,
  randonnee: Mountains,
  escalade: PersonSimpleHike,
  yoga: FlowerLotus,
  pilates: FlowerLotus,
  crossfit: Lightning,
  boxe: BoxingGlove,
  'arts-martiaux': HandFist,
  danse: MusicNotes,
  skate: PersonSimpleRun,
  ski: Mountains,
  golf: Golf,
  fitness: Flame,
  'autre-sport': Trophy,

  // Gaming
  valorant: Crosshair,
  lol: Sword,
  'wild-rift': Sword,
  cod: Crosshair,
  fortnite: TreasureChest,
  minecraft: Cube,
  fifa: SoccerBall,
  'rocket-league': Car,
  apex: Target,
  cs2: Crosshair,
  overwatch: Target,
  gta: Car,
  warzone: Crosshair,
  destiny: Moon,
  diablo: Flame,
  wow: Sword,
  genshin: Sparkle,
  roblox: Cube,
  'among-us': Ghost,
  pokemon: Lightning,
  zelda: Sword,
  'street-fighter': HandFist,
  tekken: HandFist,
  smash: Lightning,
  overcooked: CookingPot,
  'it-takes-two': PuzzlePiece,
  'lethal-company': Ghost,
  phasmophobia: Flashlight,
  stardew: TreeEvergreen,
  'indie-coop': DiceSix,
  'autre-jeu': Joystick,

  // Éducation
  maths: Calculator,
  anglais: Translate,
  code: Code,
  design: PaintBrush,
  prepa: PenNib,
  langues: Translate,
  physique: Binoculars,
  eco: ChartBar,
  droit: Scales,
  medecine: FirstAid,

  // Musique
  guitare: Guitar,
  basse: Guitar,
  piano: PianoKeys,
  batterie: MusicNote,
  violon: MusicNotes,
  ukulele: Guitar,
  saxophone: MusicNotes,
  trompette: MusicNotes,
  flute: MusicNotes,
  synthe: Waveform,
  chant: Microphone,
  chorale: UsersThree,
  prod: Headphones,
  composition: MusicNotes,
  dj: Disc,
  beatbox: Microphone,
  jam: SpeakerHigh,
  'autre-musique': MusicNotes,

  // Hobbies
  lecture: Books,
  ecriture: PenNib,
  musees: Building,
  histoire: Books,
  cinema: FilmSlate,
  theatre: MaskHappy,
  photo: Camera,
  dessin: Palette,
  cuisine: CookingPot,
  jardinage: Plant,
  voyage: AirplaneTilt,
  'board-games': DiceSix,
  'escape-game': LockKey,
  astronomie: Binoculars,
  bricolage: Needle,
  couture: Needle,
  podcasts: Headphones,
  benevolat: Handshake,
  startup: Rocket,
  'autre-hobby': Sparkle,
};

type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  weight?: IconWeight;
  style?: StyleProp<ViewStyle>;
  /**
   * Si un glyphe Simple Icons existe pour `name` :
   * - `true` → fill marque (hex SI), sauf noir/blanc → `color`
   * - `false` (défaut) → mono teinté avec `color` (thème / accent)
   */
  branded?: boolean;
};

export function Icon({
  name,
  size = 20,
  color = '#12212B',
  weight = 'regular',
  style,
  branded = false,
}: IconProps) {
  const brand = getBrandIcon(name);
  if (brand) {
    const fill = branded ? readableBrandFill(brand.hex, color) : color;
    return <BrandIcon path={brand.path} size={size} color={fill} style={style} />;
  }
  const Comp = ICONS[name] ?? ICONS.spark;
  return <Comp size={size} color={color} weight={weight} style={style} />;
}

/** Résout un id catalogue (univers, sous-catégorie, plateforme, vibe, dispo). */
export function resolveCatalogIcon(id: string | null | undefined): IconName {
  if (!id) return 'spark';
  if (id in ICONS) return id as IconName;
  return 'spark';
}

export function universeIcon(id: UniverseId): IconName {
  return resolveCatalogIcon(id);
}
