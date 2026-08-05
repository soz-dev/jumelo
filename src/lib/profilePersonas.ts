export type ProfilePersonaId =
  | 'nova'
  | 'orbit'
  | 'ember'
  | 'grove'
  | 'pulse'
  | 'drift'
  | 'pixel'
  | 'halo';

export type ProfilePersona = {
  id: ProfilePersonaId;
  label: string;
  /** Couleur de fond / fallback Avatar */
  color: string;
  accent: string;
  soft: string;
  /** Motif SVG stylisé */
  motif: 'spark' | 'orbit' | 'flame' | 'leaf' | 'wave' | 'sun' | 'grid' | 'ring';
};

export const PROFILE_PERSONAS: ProfilePersona[] = [
  {
    id: 'nova',
    label: 'Nova',
    color: '#0186F0',
    accent: '#BAE6FD',
    soft: '#0C4A6E',
    motif: 'spark',
  },
  {
    id: 'orbit',
    label: 'Orbit',
    color: '#2563EB',
    accent: '#93C5FD',
    soft: '#1E3A8A',
    motif: 'orbit',
  },
  {
    id: 'ember',
    label: 'Ember',
    color: '#011867',
    accent: '#68C3FF',
    soft: '#000F46',
    motif: 'flame',
  },
  {
    id: 'grove',
    label: 'Grove',
    color: '#1FA97A',
    accent: '#BBF7D0',
    soft: '#14532D',
    motif: 'leaf',
  },
  {
    id: 'pulse',
    label: 'Pulse',
    color: '#7C5CFC',
    accent: '#DDD6FE',
    soft: '#4C1D95',
    motif: 'wave',
  },
  {
    id: 'drift',
    label: 'Drift',
    color: '#F59E0B',
    accent: '#FDE68A',
    soft: '#78350F',
    motif: 'sun',
  },
  {
    id: 'pixel',
    label: 'Pixel',
    color: '#0891B2',
    accent: '#A5F3FC',
    soft: '#164E63',
    motif: 'grid',
  },
  {
    id: 'halo',
    label: 'Halo',
    color: '#DB2777',
    accent: '#FBCFE8',
    soft: '#831843',
    motif: 'ring',
  },
];

export function getPersona(id: string | null | undefined): ProfilePersona | undefined {
  if (!id) return undefined;
  return PROFILE_PERSONAS.find((p) => p.id === id);
}

export function isPersonaId(id: string | null | undefined): id is ProfilePersonaId {
  return Boolean(id && PROFILE_PERSONAS.some((p) => p.id === id));
}
