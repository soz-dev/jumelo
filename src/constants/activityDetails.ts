import {
  PlatformId,
  UniverseId,
  getSubCategory,
  levels,
} from './catalog';

export type ActivityDetailValue = string | number | boolean | null;

export type ActivityDetails = Record<string, ActivityDetailValue>;

export type DetailFieldType = 'select' | 'scale' | 'boolean' | 'years';

export type DetailOption = {
  id: string;
  label: string;
};

export type DetailField = {
  id: string;
  label: string;
  hint?: string;
  type: DetailFieldType;
  required?: boolean;
  /** Options statiques (select) */
  options?: DetailOption[];
  /** Remplit options depuis les plateformes du jeu */
  optionsFrom?: 'platforms';
  min?: number;
  max?: number;
};

const levelOptions: DetailOption[] = levels.map((l) => ({
  id: l.id,
  label: l.label,
}));

const frequencyOptions: DetailOption[] = [
  { id: 'rare', label: 'Rarement' },
  { id: '1x', label: '1× / semaine' },
  { id: '2-3x', label: '2–3× / semaine' },
  { id: 'quotidien', label: 'Presque tous les jours' },
];

const formatOptions: DetailOption[] = [
  { id: 'presentiel', label: 'Présentiel' },
  { id: 'online', label: 'En ligne' },
  { id: 'hybride', label: 'Hybride' },
];

const musicStyleOptions: DetailOption[] = [
  { id: 'classique', label: 'Classique' },
  { id: 'jazz', label: 'Jazz' },
  { id: 'pop', label: 'Pop / variété' },
  { id: 'rock', label: 'Rock' },
  { id: 'electro', label: 'Électro' },
  { id: 'autre', label: 'Autre / mixte' },
];

const footballPositions: DetailOption[] = [
  { id: 'gardien', label: 'Gardien' },
  { id: 'defenseur', label: 'Défenseur' },
  { id: 'milieu', label: 'Milieu' },
  { id: 'attaquant', label: 'Attaquant' },
  { id: 'polyvalent', label: 'Polyvalent' },
];

const teamSportPositions: DetailOption[] = [
  { id: 'poste-principal', label: 'Poste principal' },
  { id: 'polyvalent', label: 'Polyvalent' },
  { id: 'peu-importe', label: 'Peu importe' },
];

const gamingModeOptions: DetailOption[] = [
  { id: 'ranked', label: 'Ranked / compétitif' },
  { id: 'casual', label: 'Casual / fun' },
  { id: 'custom', label: 'Custom / privé' },
  { id: 'mixte', label: 'Les deux' },
];

const studyGoalOptions: DetailOption[] = [
  { id: 'reviser', label: 'Réviser' },
  { id: 'progresser', label: 'Progresser' },
  { id: 'examen', label: 'Préparer un examen' },
  { id: 'projet', label: 'Projet / devoir' },
  { id: 'mentorat', label: 'Mentorat' },
];

/** Schémas par défaut selon l’univers */
const defaultsByUniverse: Record<UniverseId, DetailField[]> = {
  gaming: [
    {
      id: 'platform',
      label: 'Plateforme',
      hint: 'Où tu joues',
      type: 'select',
      required: true,
      optionsFrom: 'platforms',
    },
    {
      id: 'level',
      label: 'Niveau',
      type: 'select',
      required: true,
      options: levelOptions,
    },
    {
      id: 'mode',
      label: 'Mode préféré',
      type: 'select',
      options: gamingModeOptions,
    },
  ],
  sports: [
    {
      id: 'level',
      label: 'Niveau',
      type: 'select',
      required: true,
      options: levelOptions,
    },
    {
      id: 'years',
      label: 'Depuis combien d’années ?',
      type: 'years',
      required: true,
      min: 0,
      max: 40,
    },
    {
      id: 'frequency',
      label: 'Fréquence',
      type: 'select',
      required: true,
      options: frequencyOptions,
    },
  ],
  education: [
    {
      id: 'format',
      label: 'Format',
      type: 'select',
      required: true,
      options: formatOptions,
    },
    {
      id: 'level',
      label: 'Niveau',
      type: 'select',
      required: true,
      options: levelOptions,
    },
    {
      id: 'goal',
      label: 'Objectif',
      type: 'select',
      required: true,
      options: studyGoalOptions,
    },
  ],
  music: [
    {
      id: 'hasInstrument',
      label: 'Tu as ton instrument ?',
      type: 'boolean',
      required: true,
    },
    {
      id: 'skill',
      label: 'Niveau / 10',
      type: 'scale',
      required: true,
      min: 1,
      max: 10,
    },
    {
      id: 'years',
      label: 'Années de pratique',
      type: 'years',
      required: true,
      min: 0,
      max: 40,
    },
    {
      id: 'style',
      label: 'Style',
      type: 'select',
      options: musicStyleOptions,
    },
  ],
  hobbies: [
    {
      id: 'format',
      label: 'Format',
      type: 'select',
      required: true,
      options: [
        { id: 'irl', label: 'En vrai' },
        { id: 'online', label: 'En ligne' },
        { id: 'les-deux', label: 'Les deux' },
      ],
    },
    {
      id: 'level',
      label: 'Niveau',
      type: 'select',
      required: true,
      options: levelOptions,
    },
    {
      id: 'frequency',
      label: 'Fréquence',
      type: 'select',
      options: frequencyOptions,
    },
  ],
};

/** Overrides par activité (id sous-catégorie) */
const overridesByActivity: Partial<Record<string, DetailField[]>> = {
  // Sport — sports collectifs
  football: [
    {
      id: 'level',
      label: 'Niveau',
      type: 'select',
      required: true,
      options: levelOptions,
    },
    {
      id: 'position',
      label: 'Poste',
      type: 'select',
      required: true,
      options: footballPositions,
    },
    {
      id: 'years',
      label: 'Depuis combien d’années ?',
      type: 'years',
      required: true,
      min: 0,
      max: 40,
    },
    {
      id: 'frequency',
      label: 'Fréquence',
      type: 'select',
      required: true,
      options: frequencyOptions,
    },
  ],
  basket: [
    {
      id: 'level',
      label: 'Niveau',
      type: 'select',
      required: true,
      options: levelOptions,
    },
    {
      id: 'position',
      label: 'Poste',
      type: 'select',
      options: teamSportPositions,
    },
    {
      id: 'years',
      label: 'Depuis combien d’années ?',
      type: 'years',
      required: true,
      min: 0,
      max: 40,
    },
    {
      id: 'frequency',
      label: 'Fréquence',
      type: 'select',
      required: true,
      options: frequencyOptions,
    },
  ],
  handball: [
    {
      id: 'level',
      label: 'Niveau',
      type: 'select',
      required: true,
      options: levelOptions,
    },
    {
      id: 'position',
      label: 'Poste',
      type: 'select',
      options: teamSportPositions,
    },
    {
      id: 'years',
      label: 'Depuis combien d’années ?',
      type: 'years',
      required: true,
      min: 0,
      max: 40,
    },
    {
      id: 'frequency',
      label: 'Fréquence',
      type: 'select',
      required: true,
      options: frequencyOptions,
    },
  ],
  volley: [
    {
      id: 'level',
      label: 'Niveau',
      type: 'select',
      required: true,
      options: levelOptions,
    },
    {
      id: 'position',
      label: 'Poste',
      type: 'select',
      options: teamSportPositions,
    },
    {
      id: 'years',
      label: 'Depuis combien d’années ?',
      type: 'years',
      required: true,
      min: 0,
      max: 40,
    },
    {
      id: 'frequency',
      label: 'Fréquence',
      type: 'select',
      required: true,
      options: frequencyOptions,
    },
  ],
  rugby: [
    {
      id: 'level',
      label: 'Niveau',
      type: 'select',
      required: true,
      options: levelOptions,
    },
    {
      id: 'position',
      label: 'Poste',
      type: 'select',
      options: teamSportPositions,
    },
    {
      id: 'years',
      label: 'Depuis combien d’années ?',
      type: 'years',
      required: true,
      min: 0,
      max: 40,
    },
    {
      id: 'frequency',
      label: 'Fréquence',
      type: 'select',
      required: true,
      options: frequencyOptions,
    },
  ],
  muscu: [
    {
      id: 'level',
      label: 'Niveau',
      type: 'select',
      required: true,
      options: levelOptions,
    },
    {
      id: 'years',
      label: 'Depuis combien d’années ?',
      type: 'years',
      required: true,
      min: 0,
      max: 40,
    },
    {
      id: 'frequency',
      label: 'Fréquence',
      type: 'select',
      required: true,
      options: frequencyOptions,
    },
    {
      id: 'focus',
      label: 'Objectif',
      type: 'select',
      options: [
        { id: 'force', label: 'Force' },
        { id: 'hypertrophie', label: 'Prise de masse' },
        { id: 'seche', label: 'Sèche / définition' },
        { id: 'forme', label: 'Forme générale' },
      ],
    },
  ],
  running: [
    {
      id: 'level',
      label: 'Niveau',
      type: 'select',
      required: true,
      options: levelOptions,
    },
    {
      id: 'years',
      label: 'Depuis combien d’années ?',
      type: 'years',
      required: true,
      min: 0,
      max: 40,
    },
    {
      id: 'frequency',
      label: 'Fréquence',
      type: 'select',
      required: true,
      options: frequencyOptions,
    },
    {
      id: 'distance',
      label: 'Distance typique',
      type: 'select',
      options: [
        { id: '5k', label: '5 km' },
        { id: '10k', label: '10 km' },
        { id: 'semi', label: 'Semi' },
        { id: 'marathon', label: 'Marathon+' },
        { id: 'trail', label: 'Trail' },
      ],
    },
  ],
  tennis: [
    {
      id: 'level',
      label: 'Niveau',
      type: 'select',
      required: true,
      options: levelOptions,
    },
    {
      id: 'years',
      label: 'Depuis combien d’années ?',
      type: 'years',
      required: true,
      min: 0,
      max: 40,
    },
    {
      id: 'frequency',
      label: 'Fréquence',
      type: 'select',
      required: true,
      options: frequencyOptions,
    },
    {
      id: 'hand',
      label: 'Main',
      type: 'select',
      options: [
        { id: 'droite', label: 'Droitier' },
        { id: 'gauche', label: 'Gaucher' },
      ],
    },
  ],
  yoga: [
    {
      id: 'level',
      label: 'Niveau',
      type: 'select',
      required: true,
      options: levelOptions,
    },
    {
      id: 'years',
      label: 'Depuis combien d’années ?',
      type: 'years',
      min: 0,
      max: 40,
    },
    {
      id: 'format',
      label: 'Format',
      type: 'select',
      required: true,
      options: formatOptions,
    },
  ],
  pilates: [
    {
      id: 'level',
      label: 'Niveau',
      type: 'select',
      required: true,
      options: levelOptions,
    },
    {
      id: 'years',
      label: 'Depuis combien d’années ?',
      type: 'years',
      min: 0,
      max: 40,
    },
    {
      id: 'format',
      label: 'Format',
      type: 'select',
      required: true,
      options: formatOptions,
    },
  ],
  // Musique — chant / chorale / prod (pas d’instrument physique)
  chant: [
    {
      id: 'skill',
      label: 'Niveau / 10',
      type: 'scale',
      required: true,
      min: 1,
      max: 10,
    },
    {
      id: 'years',
      label: 'Années de pratique',
      type: 'years',
      required: true,
      min: 0,
      max: 40,
    },
    {
      id: 'style',
      label: 'Style',
      type: 'select',
      options: musicStyleOptions,
    },
    {
      id: 'format',
      label: 'Format',
      type: 'select',
      options: formatOptions,
    },
  ],
  chorale: [
    {
      id: 'skill',
      label: 'Niveau / 10',
      type: 'scale',
      required: true,
      min: 1,
      max: 10,
    },
    {
      id: 'years',
      label: 'Années de pratique',
      type: 'years',
      required: true,
      min: 0,
      max: 40,
    },
    {
      id: 'voice',
      label: 'Tessiture',
      type: 'select',
      options: [
        { id: 'soprano', label: 'Soprano' },
        { id: 'alto', label: 'Alto' },
        { id: 'tenor', label: 'Ténor' },
        { id: 'basse', label: 'Basse' },
        { id: 'autre', label: 'Autre / flex' },
      ],
    },
  ],
  prod: [
    {
      id: 'skill',
      label: 'Niveau / 10',
      type: 'scale',
      required: true,
      min: 1,
      max: 10,
    },
    {
      id: 'years',
      label: 'Années de pratique',
      type: 'years',
      required: true,
      min: 0,
      max: 40,
    },
    {
      id: 'daw',
      label: 'DAW',
      type: 'select',
      options: [
        { id: 'ableton', label: 'Ableton' },
        { id: 'fl', label: 'FL Studio' },
        { id: 'logic', label: 'Logic' },
        { id: 'cubase', label: 'Cubase' },
        { id: 'autre', label: 'Autre' },
      ],
    },
    {
      id: 'style',
      label: 'Style',
      type: 'select',
      options: musicStyleOptions,
    },
  ],
  dj: [
    {
      id: 'hasGear',
      label: 'Tu as ton matos ?',
      type: 'boolean',
      required: true,
    },
    {
      id: 'skill',
      label: 'Niveau / 10',
      type: 'scale',
      required: true,
      min: 1,
      max: 10,
    },
    {
      id: 'years',
      label: 'Années de pratique',
      type: 'years',
      required: true,
      min: 0,
      max: 40,
    },
    {
      id: 'style',
      label: 'Style',
      type: 'select',
      options: musicStyleOptions,
    },
  ],
  beatbox: [
    {
      id: 'skill',
      label: 'Niveau / 10',
      type: 'scale',
      required: true,
      min: 1,
      max: 10,
    },
    {
      id: 'years',
      label: 'Années de pratique',
      type: 'years',
      required: true,
      min: 0,
      max: 40,
    },
    {
      id: 'style',
      label: 'Style',
      type: 'select',
      options: musicStyleOptions,
    },
  ],
  jam: [
    {
      id: 'hasInstrument',
      label: 'Tu as ton instrument ?',
      type: 'boolean',
      required: true,
    },
    {
      id: 'skill',
      label: 'Niveau / 10',
      type: 'scale',
      required: true,
      min: 1,
      max: 10,
    },
    {
      id: 'style',
      label: 'Style',
      type: 'select',
      required: true,
      options: musicStyleOptions,
    },
    {
      id: 'format',
      label: 'Format',
      type: 'select',
      options: formatOptions,
    },
  ],
  // Hobbies ciblés
  musees: [
    {
      id: 'frequency',
      label: 'Fréquence',
      type: 'select',
      required: true,
      options: frequencyOptions,
    },
    {
      id: 'interest',
      label: 'Centré sur',
      type: 'select',
      options: [
        { id: 'art', label: 'Art' },
        { id: 'histoire', label: 'Histoire' },
        { id: 'science', label: 'Science' },
        { id: 'mixte', label: 'Un peu de tout' },
      ],
    },
  ],
  cinema: [
    {
      id: 'format',
      label: 'Format',
      type: 'select',
      required: true,
      options: [
        { id: 'salle', label: 'En salle' },
        { id: 'streaming', label: 'Streaming' },
        { id: 'les-deux', label: 'Les deux' },
      ],
    },
    {
      id: 'genre',
      label: 'Genres préférés',
      type: 'select',
      options: [
        { id: 'action', label: 'Action' },
        { id: 'drame', label: 'Drame' },
        { id: 'comedie', label: 'Comédie' },
        { id: 'sf', label: 'SF / fantasy' },
        { id: 'mixte', label: 'Ouvert à tout' },
      ],
    },
  ],
  'board-games': [
    {
      id: 'format',
      label: 'Format',
      type: 'select',
      required: true,
      options: [
        { id: 'irl', label: 'En vrai' },
        { id: 'online', label: 'En ligne' },
        { id: 'les-deux', label: 'Les deux' },
      ],
    },
    {
      id: 'level',
      label: 'Niveau',
      type: 'select',
      required: true,
      options: levelOptions,
    },
    {
      id: 'complexity',
      label: 'Complexité aimée',
      type: 'select',
      options: [
        { id: 'party', label: 'Party games' },
        { id: 'famille', label: 'Familial' },
        { id: 'expert', label: 'Expert / euro' },
        { id: 'mixte', label: 'Mixte' },
      ],
    },
  ],
  'escape-game': [
    {
      id: 'level',
      label: 'Niveau',
      type: 'select',
      required: true,
      options: levelOptions,
    },
    {
      id: 'frequency',
      label: 'Fréquence',
      type: 'select',
      options: frequencyOptions,
    },
  ],
  cuisine: [
    {
      id: 'level',
      label: 'Niveau',
      type: 'select',
      required: true,
      options: levelOptions,
    },
    {
      id: 'years',
      label: 'Depuis combien d’années ?',
      type: 'years',
      min: 0,
      max: 40,
    },
    {
      id: 'focus',
      label: 'Style',
      type: 'select',
      options: [
        { id: 'quotidien', label: 'Cuisine du quotidien' },
        { id: 'patisserie', label: 'Pâtisserie' },
        { id: 'monde', label: 'Cuisines du monde' },
        { id: 'healthy', label: 'Healthy' },
      ],
    },
  ],
  startup: [
    {
      id: 'format',
      label: 'Format',
      type: 'select',
      required: true,
      options: formatOptions,
    },
    {
      id: 'level',
      label: 'Expérience',
      type: 'select',
      required: true,
      options: levelOptions,
    },
    {
      id: 'role',
      label: 'Rôle recherché',
      type: 'select',
      options: [
        { id: 'tech', label: 'Tech' },
        { id: 'biz', label: 'Business' },
        { id: 'design', label: 'Design' },
        { id: 'generaliste', label: 'Généraliste' },
      ],
    },
  ],
};

function resolveFieldOptions(
  field: DetailField,
  universeId: UniverseId,
  subCategoryId: string,
): DetailOption[] {
  if (field.optionsFrom === 'platforms') {
    const sub = getSubCategory(universeId, subCategoryId);
    return (sub?.platforms ?? []).map((p) => ({
      id: p.id,
      label: p.label,
    }));
  }
  return field.options ?? [];
}

/** Champs de précisions pour une activité */
export function getActivityDetailFields(
  universeId: UniverseId,
  subCategoryId: string,
): DetailField[] {
  const base = overridesByActivity[subCategoryId] ?? defaultsByUniverse[universeId] ?? [];
  return base.map((field) => {
    if (field.optionsFrom === 'platforms') {
      return {
        ...field,
        options: resolveFieldOptions(field, universeId, subCategoryId),
      };
    }
    return field;
  });
}

export function isDetailValueFilled(value: ActivityDetailValue | undefined): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.length > 0;
  return true;
}

/** Tous les champs requis sont renseignés */
export function areRequiredDetailsFilled(
  fields: DetailField[],
  details: ActivityDetails,
): boolean {
  return fields
    .filter((f) => f.required)
    .every((f) => isDetailValueFilled(details[f.id]));
}

/** Extrait la plateforme gaming depuis activityDetails (rétrocompat) */
export function platformFromDetails(details: ActivityDetails): PlatformId | null {
  const value = details.platform;
  if (typeof value === 'string' && value.length > 0) {
    return value as PlatformId;
  }
  return null;
}

export function emptyActivityDetails(): ActivityDetails {
  return {};
}

/** Libellé court pour le CTA (ex. « PC · Intermédiaire ») */
export function summarizeActivityDetails(
  fields: DetailField[],
  details: ActivityDetails,
): string {
  const parts: string[] = [];
  for (const field of fields) {
    const raw = details[field.id];
    if (!isDetailValueFilled(raw)) continue;

    if (field.type === 'boolean') {
      parts.push(raw === true ? field.label : `Pas ${field.label.toLowerCase()}`);
      continue;
    }
    if (field.type === 'scale') {
      parts.push(`${raw}/10`);
      continue;
    }
    if (field.type === 'years') {
      parts.push(`${raw} an${Number(raw) > 1 ? 's' : ''}`);
      continue;
    }
    const opt = field.options?.find((o) => o.id === raw);
    if (opt) parts.push(opt.label);
  }
  return parts.slice(0, 2).join(' · ');
}
