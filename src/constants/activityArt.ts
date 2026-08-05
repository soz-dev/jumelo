/**
 * Artwork coloré (Twemoji CC-BY 4.0) pour les activités non-gaming.
 *
 * Assets locaux : `assets/icons/activities/{id}.png`
 * Voir `assets/icons/activities/LICENSE.md`.
 *
 * Gaming → `gameArt.ts` / `GameArtImage` (jaquettes store).
 */

import type { ImageSourcePropType } from 'react-native';

/** require() Metro — mapping id catalogue → PNG Twemoji local */
export const ACTIVITY_ART: Record<string, ImageSourcePropType> = {
  // Sports
  football: require('../../assets/icons/activities/football.png'),
  muscu: require('../../assets/icons/activities/muscu.png'),
  running: require('../../assets/icons/activities/running.png'),
  basket: require('../../assets/icons/activities/basket.png'),
  tennis: require('../../assets/icons/activities/tennis.png'),
  padel: require('../../assets/icons/activities/padel.png'),
  badminton: require('../../assets/icons/activities/badminton.png'),
  volley: require('../../assets/icons/activities/volley.png'),
  handball: require('../../assets/icons/activities/handball.png'),
  rugby: require('../../assets/icons/activities/rugby.png'),
  natation: require('../../assets/icons/activities/natation.png'),
  velo: require('../../assets/icons/activities/velo.png'),
  randonnee: require('../../assets/icons/activities/randonnee.png'),
  escalade: require('../../assets/icons/activities/escalade.png'),
  yoga: require('../../assets/icons/activities/yoga.png'),
  pilates: require('../../assets/icons/activities/pilates.png'),
  crossfit: require('../../assets/icons/activities/crossfit.png'),
  boxe: require('../../assets/icons/activities/boxe.png'),
  'arts-martiaux': require('../../assets/icons/activities/arts-martiaux.png'),
  danse: require('../../assets/icons/activities/danse.png'),
  skate: require('../../assets/icons/activities/skate.png'),
  ski: require('../../assets/icons/activities/ski.png'),
  golf: require('../../assets/icons/activities/golf.png'),
  fitness: require('../../assets/icons/activities/fitness.png'),
  'autre-sport': require('../../assets/icons/activities/autre-sport.png'),
  // Éducation
  maths: require('../../assets/icons/activities/maths.png'),
  anglais: require('../../assets/icons/activities/anglais.png'),
  code: require('../../assets/icons/activities/code.png'),
  design: require('../../assets/icons/activities/design.png'),
  prepa: require('../../assets/icons/activities/prepa.png'),
  langues: require('../../assets/icons/activities/langues.png'),
  physique: require('../../assets/icons/activities/physique.png'),
  eco: require('../../assets/icons/activities/eco.png'),
  droit: require('../../assets/icons/activities/droit.png'),
  medecine: require('../../assets/icons/activities/medecine.png'),
  // Musique
  guitare: require('../../assets/icons/activities/guitare.png'),
  basse: require('../../assets/icons/activities/basse.png'),
  piano: require('../../assets/icons/activities/piano.png'),
  batterie: require('../../assets/icons/activities/batterie.png'),
  violon: require('../../assets/icons/activities/violon.png'),
  ukulele: require('../../assets/icons/activities/ukulele.png'),
  saxophone: require('../../assets/icons/activities/saxophone.png'),
  trompette: require('../../assets/icons/activities/trompette.png'),
  flute: require('../../assets/icons/activities/flute.png'),
  synthe: require('../../assets/icons/activities/synthe.png'),
  chant: require('../../assets/icons/activities/chant.png'),
  chorale: require('../../assets/icons/activities/chorale.png'),
  prod: require('../../assets/icons/activities/prod.png'),
  composition: require('../../assets/icons/activities/composition.png'),
  dj: require('../../assets/icons/activities/dj.png'),
  beatbox: require('../../assets/icons/activities/beatbox.png'),
  jam: require('../../assets/icons/activities/jam.png'),
  'autre-musique': require('../../assets/icons/activities/autre-musique.png'),
  // Hobbies
  lecture: require('../../assets/icons/activities/lecture.png'),
  ecriture: require('../../assets/icons/activities/ecriture.png'),
  musees: require('../../assets/icons/activities/musees.png'),
  histoire: require('../../assets/icons/activities/histoire.png'),
  cinema: require('../../assets/icons/activities/cinema.png'),
  theatre: require('../../assets/icons/activities/theatre.png'),
  photo: require('../../assets/icons/activities/photo.png'),
  dessin: require('../../assets/icons/activities/dessin.png'),
  cuisine: require('../../assets/icons/activities/cuisine.png'),
  jardinage: require('../../assets/icons/activities/jardinage.png'),
  voyage: require('../../assets/icons/activities/voyage.png'),
  'board-games': require('../../assets/icons/activities/board-games.png'),
  'escape-game': require('../../assets/icons/activities/escape-game.png'),
  astronomie: require('../../assets/icons/activities/astronomie.png'),
  bricolage: require('../../assets/icons/activities/bricolage.png'),
  couture: require('../../assets/icons/activities/couture.png'),
  podcasts: require('../../assets/icons/activities/podcasts.png'),
  benevolat: require('../../assets/icons/activities/benevolat.png'),
  startup: require('../../assets/icons/activities/startup.png'),
  'autre-hobby': require('../../assets/icons/activities/autre-hobby.png'),
};

export function getActivityArt(
  catalogId: string | null | undefined,
): ImageSourcePropType | null {
  if (!catalogId) return null;
  return ACTIVITY_ART[catalogId] ?? null;
}

export function hasActivityArt(catalogId: string | null | undefined): boolean {
  return getActivityArt(catalogId) != null;
}
