/**
 * Photos lifestyle Unsplash (droits libres) — personnes réelles en activité.
 * Pas de jaquettes / key art de jeux.
 *
 * Format CDN : images.unsplash.com + auto=format&fit=crop&w=
 */
import type { UniverseId } from './catalog';

const u = (id: string, w = 900) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

/** Couvertures « Tes univers » — un visuel plein cadre par catégorie. */
export const UNIVERSE_COVER_PHOTOS: Record<UniverseId, string> = {
  gaming: u('photo-1511512578047-dfb367046420'), // amis console
  sports: u('photo-1461897104016-0b3b00cc81ee'), // sport collectif
  education: u('photo-1434030216411-0b793f4b4173'), // révision / études
  music: u('photo-1511379938547-c1f69419868d'), // instruments / studio
  hobbies: u('photo-1489599849927-2ee91cede3ba'), // cinéma / culture
};

/**
 * Visuels « Tes intérêts » — photos de personnes (contexte lifestyle)
 * indexées par id sous-catégorie catalogue.
 */
export const INTEREST_PHOTOS: Record<string, string> = {
  // —— Gaming : personnes qui jouent (pas de covers de jeux) ——
  valorant: u('photo-1542751371-adc38448a05e'),
  lol: u('photo-1538481199705-c710c4e965fc'),
  'wild-rift': u('photo-1556656793-08538906a9f8'),
  cod: u('photo-1493711662062-fa541adb3fc8'),
  fortnite: u('photo-1606144042614-b2417e99c4e3'),
  minecraft: u('photo-1552820728-8b83bb6b773f'),
  fifa: u('photo-1612287230202-1ff1d85d1bdf'),
  'rocket-league': u('photo-1511882150382-421056c89033'),
  apex: u('photo-1542751110-97427bbecf20'),
  cs2: u('photo-1560253023-3ec5d502959f'),
  gta: u('photo-1511512578047-dfb367046420'),

  // —— Sports ——
  football: u('photo-1574629810360-7efbbe195018'),
  muscu: u('photo-1534438327276-14e5300c3a48'),
  running: u('photo-1476480862126-209bfaa8edc8'),
  basket: u('photo-1546519638-68e109498ffc'),
  tennis: u('photo-1554068865-24cecd4e34b8'),
  padel: u('photo-1554068865-24cecd4e34b8'),
  badminton: u('photo-1554068865-24cecd4e34b8'),
  volley: u('photo-1612872087720-bb876e2e67d1'),
  handball: u('photo-1551958219-acbc608c6377'),
  rugby: u('photo-1517466787929-bc90951d0974'),
  natation: u('photo-1530549387789-4c1017266635'),
  velo: u('photo-1541625602330-2277a4c46182'),
  randonnee: u('photo-1551632811-561732d1e306'),
  escalade: u('photo-1521412644187-c49fa049e84d'),
  yoga: u('photo-1544367567-0f2fcb009e0b'),
  pilates: u('photo-1518611012118-696072aa579a'),
  crossfit: u('photo-1517836357463-d25dfeac3438'),
  boxe: u('photo-1599058917765-a780eda07a3e'),
  'arts-martiaux': u('photo-1555597673-b21d5c935865'),
  danse: u('photo-1508700929628-666bc8bd84ea'),
  skate: u('photo-1532298229144-0ec0c57515c7'),
  ski: u('photo-1551698618-1dfe5d97d256'),
  golf: u('photo-1535131749006-b7f58c99034b'),
  fitness: u('photo-1571019614242-c5c5dee9f50b'),
  'autre-sport': u('photo-1461897104016-0b3b00cc81ee'),

  // —— Éducation ——
  maths: u('photo-1509228468518-180dd4864904'),
  anglais: u('photo-1503676260728-1c00da094a0b'),
  code: u('photo-1516321318423-f06f85e504b3'),
  design: u('photo-1561070791-2526d30994b5'),
  prepa: u('photo-1434030216411-0b793f4b4173'),
  langues: u('photo-1546410531-bb4caa6b424d'),
  physique: u('photo-1532094349884-543bc11b234d'),
  eco: u('photo-1454165804606-c3d57bc86b40'),
  droit: u('photo-1589829545856-d10d557cf95f'),
  medecine: u('photo-1576091160399-112ba8d25d1d'),

  // —— Musique ——
  guitare: u('photo-1510915361894-db8b60106cb1'),
  basse: u('photo-1513885535751-8b9238bd345a'),
  piano: u('photo-1552423314-cf29ab68ad73'),
  batterie: u('photo-1519892300165-cb5542fb47c7'),
  violon: u('photo-1460723237483-7a6dc9d0b212'),
  ukulele: u('photo-1511379938547-c1f69419868d'),
  saxophone: u('photo-1493225457124-a3eb161ffa5f'),
  trompette: u('photo-1493225457124-a3eb161ffa5f'),
  flute: u('photo-1465847899084-d164df4dedc6'),
  synthe: u('photo-1598488035139-bdbb2231ce04'),
  chant: u('photo-1511671782779-c97d3d27a1d4'),
  chorale: u('photo-1465847899084-d164df4dedc6'),
  prod: u('photo-1598488035139-bdbb2231ce04'),
  composition: u('photo-1491841550275-ad7854e35ca6'),
  dj: u('photo-1571330735066-03aaa9429d89'),
  beatbox: u('photo-1511671782779-c97d3d27a1d4'),
  jam: u('photo-1511379938547-c1f69419868d'),
  'autre-musique': u('photo-1511379938547-c1f69419868d'),

  // —— Hobbies ——
  lecture: u('photo-1507842217343-583bb7270b66'),
  ecriture: u('photo-1455390582262-044cdead277a'),
  musees: u('photo-1578301978162-7aae4d755744'),
  histoire: u('photo-1552168324-d612d77725e3'),
  cinema: u('photo-1489599849927-2ee91cede3ba'),
  theatre: u('photo-1503095396549-807759245b35'),
  photo: u('photo-1516035069371-29a1b244cc32'),
  dessin: u('photo-1513364776144-60967b0f800f'),
  cuisine: u('photo-1556910103-1c02745aae4d'),
  jardinage: u('photo-1416879595882-3373a0480b5b'),
  voyage: u('photo-1488646953014-85cb44e25828'),
  'board-games': u('photo-1529156069898-49953e39b3ac'),
  'escape-game': u('photo-1511882150382-421056c89033'),
  astronomie: u('photo-1446776653964-20c1d3a81b06'),
  bricolage: u('photo-1504148455328-c376907d081c'),
  couture: u('photo-1452860606245-08befc0ff44b'),
  podcasts: u('photo-1478737270239-2f02b77fc618'),
  benevolat: u('photo-1559027615-cd4628902d4a'),
  startup: u('photo-1522071820081-009f0129c71c'),
  'autre-hobby': u('photo-1529156069898-49953e39b3ac'),
};

/** Fallback par univers si un id n’a pas de photo dédiée. */
export function getInterestPhoto(
  catalogId: string,
  universeId?: UniverseId,
): string {
  return (
    INTEREST_PHOTOS[catalogId] ??
    (universeId ? UNIVERSE_COVER_PHOTOS[universeId] : undefined) ??
    UNIVERSE_COVER_PHOTOS.hobbies
  );
}

export function getUniverseCoverPhoto(universeId: UniverseId): string {
  return UNIVERSE_COVER_PHOTOS[universeId];
}
