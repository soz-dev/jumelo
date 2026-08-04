import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@jumelo/my-teams-order';

async function readMap(): Promise<Record<string, string[]>> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string[]>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** Remonte une équipe en tête des « équipes actives » pour cet utilisateur. */
export async function bumpMyTeam(userId: string, teamId: string): Promise<void> {
  if (!userId || !teamId) return;
  const map = await readMap();
  const prev = map[userId] ?? [];
  map[userId] = [teamId, ...prev.filter((id) => id !== teamId)].slice(0, 40);
  await AsyncStorage.setItem(KEY, JSON.stringify(map));
}

export async function getMyTeamsOrder(userId: string): Promise<string[]> {
  if (!userId) return [];
  const map = await readMap();
  return map[userId] ?? [];
}

/** Trie les équipes selon l’ordre perso (récentes / rejointes en premier). */
export function sortTeamsByMyOrder<T extends { id: string }>(
  teams: T[],
  order: string[],
): T[] {
  const rank = new Map(order.map((id, i) => [id, i]));
  return [...teams].sort((a, b) => {
    const ra = rank.has(a.id) ? (rank.get(a.id) as number) : Number.MAX_SAFE_INTEGER;
    const rb = rank.has(b.id) ? (rank.get(b.id) as number) : Number.MAX_SAFE_INTEGER;
    if (ra !== rb) return ra - rb;
    return a.id.localeCompare(b.id);
  });
}
