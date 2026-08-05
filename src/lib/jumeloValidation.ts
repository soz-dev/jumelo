import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Team } from '../data/mock';
import { isDuoCapacity } from './teamKind';

const STORAGE_KEY = '@jumelo/jumelo-validation';

export type JumeloValidationRecord = {
  teamId: string;
  /** User ids qui ont confirmé (max 2 pour un binôme). */
  confirmedBy: string[];
  /** ISO — renseigné quand les deux ont validé. */
  validatedAt: string | null;
};

type ValidationState = {
  byTeamId: Record<string, JumeloValidationRecord>;
};

function emptyState(): ValidationState {
  return { byTeamId: {} };
}

async function loadState(): Promise<ValidationState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as ValidationState;
    if (!parsed?.byTeamId || typeof parsed.byTeamId !== 'object') {
      return emptyState();
    }
    return parsed;
  } catch {
    return emptyState();
  }
}

async function saveState(state: ValidationState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** Binôme 2/2 avec au moins un partenaire (chat + validation possibles). */
export function isFormedJumelo(team: Team | null | undefined): boolean {
  if (!team || !isDuoCapacity(team.capacity)) return false;
  const members = new Set(
    [team.ownerId, ...(team.memberIds ?? [])].filter(Boolean),
  );
  return members.size >= 2;
}

export function isJumeloValidated(
  record: JumeloValidationRecord | null | undefined,
): boolean {
  if (!record) return false;
  if (record.validatedAt) return true;
  return record.confirmedBy.length >= 2;
}

export function hasUserConfirmed(
  record: JumeloValidationRecord | null | undefined,
  userId: string,
): boolean {
  if (!record || !userId) return false;
  return record.confirmedBy.includes(userId);
}

export async function getJumeloValidation(
  teamId: string,
): Promise<JumeloValidationRecord | null> {
  if (!teamId) return null;
  const state = await loadState();
  return state.byTeamId[teamId] ?? null;
}

export async function getJumeloValidationsByTeamIds(
  teamIds: string[],
): Promise<Map<string, JumeloValidationRecord>> {
  const state = await loadState();
  const out = new Map<string, JumeloValidationRecord>();
  for (const id of teamIds) {
    const row = state.byTeamId[id];
    if (row) out.set(id, row);
  }
  return out;
}

/**
 * L’utilisateur confirme le jumelo.
 * Quand les 2 membres ont confirmé → `validatedAt` est posé.
 */
export async function confirmJumeloValidation(params: {
  team: Team;
  userId: string;
}): Promise<
  | { ok: true; record: JumeloValidationRecord; justValidated: boolean }
  | { ok: false; error: string }
> {
  const { team, userId } = params;
  if (!userId) return { ok: false, error: 'Connecte-toi pour valider.' };
  if (!isDuoCapacity(team.capacity)) {
    return { ok: false, error: 'La validation concerne uniquement les jumelos.' };
  }
  if (!isFormedJumelo(team)) {
    return { ok: false, error: 'Il manque encore un partenaire.' };
  }
  const memberIds = new Set(
    [team.ownerId, ...(team.memberIds ?? [])].filter(Boolean),
  );
  if (!memberIds.has(userId)) {
    return { ok: false, error: 'Tu n’es pas membre de ce jumelo.' };
  }

  const state = await loadState();
  const prev = state.byTeamId[team.id] ?? {
    teamId: team.id,
    confirmedBy: [],
    validatedAt: null,
  };

  if (prev.validatedAt || prev.confirmedBy.includes(userId)) {
    return {
      ok: true,
      record: prev,
      justValidated: false,
    };
  }

  const confirmedBy = [...new Set([...prev.confirmedBy, userId])].filter((id) =>
    memberIds.has(id),
  );

  const bothReady =
    confirmedBy.length >= 2 &&
    [...memberIds].every((id) => confirmedBy.includes(id));

  const justValidated = bothReady && !prev.validatedAt;
  const record: JumeloValidationRecord = {
    teamId: team.id,
    confirmedBy,
    validatedAt: bothReady
      ? prev.validatedAt ?? new Date().toISOString()
      : null,
  };

  state.byTeamId[team.id] = record;
  await saveState(state);
  return { ok: true, record, justValidated };
}

export async function resetJumeloValidationDemoState(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
