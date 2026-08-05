import AsyncStorage from '@react-native-async-storage/async-storage';

import { getSupabase, isSupabaseConfigured } from './supabase';

const LOCAL_KEY = (teamId: string, userId: string) =>
  `@jumelo/checkins:${teamId}:${userId}`;

function today(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

/** Enregistre le check-in du jour pour cet utilisateur dans cette équipe. */
export async function checkInToday(teamId: string, userId: string): Promise<void> {
  const date = today();

  // Cloud
  const supabase = getSupabase();
  if (supabase && isSupabaseConfigured()) {
    await supabase
      .from('team_daily_checkins')
      .upsert({ team_id: teamId, user_id: userId, date }, { onConflict: 'team_id,user_id,date' });
  }

  // Fallback local (toujours écrit pour la cohérence offline)
  try {
    const key = LOCAL_KEY(teamId, userId);
    const raw = await AsyncStorage.getItem(key);
    const dates: string[] = raw ? JSON.parse(raw) : [];
    if (!dates.includes(date)) {
      dates.push(date);
      // Conserver les 120 derniers jours
      const trimmed = dates.sort().slice(-120);
      await AsyncStorage.setItem(key, JSON.stringify(trimmed));
    }
  } catch {
    // ignore
  }
}

/**
 * Retourne les user_ids ayant checké aujourd'hui dans cette équipe.
 * Source : Supabase si dispo, sinon local (ne voit que soi-même hors-cloud).
 */
export async function getTodayCheckins(teamId: string): Promise<string[]> {
  const date = today();
  const supabase = getSupabase();

  if (supabase && isSupabaseConfigured()) {
    const { data } = await supabase
      .from('team_daily_checkins')
      .select('user_id')
      .eq('team_id', teamId)
      .eq('date', date);
    return (data ?? []).map((r) => r.user_id as string);
  }

  return []; // sans Supabase, on ne peut pas lire les check-ins des autres
}

/**
 * Retourne les dates où TOUS les membres ont checké (= journée validée).
 * `memberIds` doit contenir tous les membres du duo/groupe.
 * Remonte jusqu'à `days` jours.
 */
export async function getValidatedDays(
  teamId: string,
  memberIds: string[],
  days = 90,
): Promise<string[]> {
  if (memberIds.length === 0) return [];

  const supabase = getSupabase();
  if (supabase && isSupabaseConfigured()) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const { data } = await supabase
      .from('team_daily_checkins')
      .select('user_id, date')
      .eq('team_id', teamId)
      .gte('date', since.toISOString().slice(0, 10))
      .order('date');

    if (!data) return [];

    // Regrouper par date → jour validé si tous les membres ont coché
    const byDate = new Map<string, Set<string>>();
    for (const row of data) {
      const d = row.date as string;
      if (!byDate.has(d)) byDate.set(d, new Set());
      byDate.get(d)!.add(row.user_id as string);
    }

    const validated: string[] = [];
    for (const [date, checkers] of byDate) {
      if (memberIds.every((uid) => checkers.has(uid))) {
        validated.push(date);
      }
    }
    return validated.sort();
  }

  return [];
}

/** Retourne le streak actuel (jours consécutifs validés jusqu'à aujourd'hui ou hier). */
export function computeStreak(validatedDays: string[]): number {
  if (validatedDays.length === 0) return 0;
  const sorted = [...validatedDays].sort().reverse(); // du plus récent
  const todayStr = today();
  const yesterdayStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  })();

  // Le streak est actif seulement si on a validé aujourd'hui ou hier
  if (sorted[0] !== todayStr && sorted[0] !== yesterdayStr) return 0;

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = Math.round((prev.getTime() - curr.getTime()) / 86_400_000);
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/** XP gagné pour N jours validés avec streak en compte. */
export function computeCheckinXp(validatedDays: string[]): number {
  const streak = computeStreak(validatedDays);
  let xp = 0;
  const sorted = [...validatedDays].sort();

  for (let i = 0; i < sorted.length; i++) {
    // Bonus progressif basé sur le streak à ce jour-là (approximation : on applique le bonus global)
    xp += 20;
  }

  // Bonus streak sur TOUS les jours du streak courant
  if (streak >= 30) xp += streak * 20;
  else if (streak >= 7) xp += streak * 10;
  else if (streak >= 3) xp += streak * 5;

  return xp;
}
