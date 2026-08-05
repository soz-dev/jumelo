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

/** Points accumulés pour n jours de série consécutifs (j1=+10, j2=+15, +5/jour). */
export function streakPoints(n: number): number {
  return Math.round(10 * n + (5 * n * (n - 1)) / 2);
}

/**
 * Retourne le streak actuel (jours consécutifs validés jusqu'à aujourd'hui ou hier).
 * graceDays=1 pour les membres premium (24h de grâce supplémentaires).
 */
export function computeStreak(validatedDays: string[], graceDays = 0): number {
  if (validatedDays.length === 0) return 0;
  const sorted = [...validatedDays].sort().reverse();
  const todayMs = new Date(today()).getTime();
  const lastMs = new Date(sorted[0]).getTime();
  const lagDays = Math.round((todayMs - lastMs) / 86_400_000);

  // Série active seulement si le dernier jour validé est dans la fenêtre autorisée
  if (lagDays > 1 + graceDays) return 0;

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = Math.round((prev.getTime() - curr.getTime()) / 86_400_000);
    if (diff <= 1 + graceDays) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * XP de check-in = points de série courants.
 * Brise la série → 0. Premium (graceDays=1) → 24h de grâce.
 */
export function computeCheckinXp(validatedDays: string[], graceDays = 0): number {
  return streakPoints(computeStreak(validatedDays, graceDays));
}
