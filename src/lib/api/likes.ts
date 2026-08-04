import { getSupabase, isSupabaseConfigured } from '../supabase';
import { isLocalUserId } from '../userIds';
import {
  dismissIncomingLike as demoDismiss,
  hasIncomingLike as demoHasIncoming,
  listIncomingLikes as demoListIncoming,
  markIncomingLikeRead as demoMarkRead,
  recordOutgoingLike as demoRecordOutgoing,
  type LikeActionResult,
  type LikeRecord,
} from '../likesStore';

function isLocalDemoId(id: string): boolean {
  return isLocalUserId(id);
}

function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

/** Persist a like; create a match row when the peer already liked us. */
export async function createLike(
  myId: string,
  peerId: string,
  score?: number,
): Promise<LikeActionResult> {
  if (!myId || !peerId || myId === peerId) {
    return { created: false, mutual: false, alreadyMatched: false };
  }

  if (!isSupabaseConfigured() || isLocalDemoId(myId) || isLocalDemoId(peerId)) {
    return demoRecordOutgoing(myId, peerId, score);
  }

  const supabase = getSupabase();
  if (!supabase) return demoRecordOutgoing(myId, peerId, score);

  const { error: insertError } = await supabase.from('likes').upsert(
    { from_user_id: myId, to_user_id: peerId },
    { onConflict: 'from_user_id,to_user_id', ignoreDuplicates: true },
  );

  if (insertError) {
    // Fall back so Expo Go demo flows stay usable even if RLS blocks
    return demoRecordOutgoing(myId, peerId, score);
  }

  const { data: reverse } = await supabase
    .from('likes')
    .select('id')
    .eq('from_user_id', peerId)
    .eq('to_user_id', myId)
    .maybeSingle();

  if (!reverse) {
    return { created: true, mutual: false, alreadyMatched: false };
  }

  const [userA, userB] = orderedPair(myId, peerId);
  const { data: existingMatch } = await supabase
    .from('matches')
    .select('id')
    .eq('user_a', userA)
    .eq('user_b', userB)
    .maybeSingle();

  if (existingMatch) {
    return { created: true, mutual: true, alreadyMatched: true };
  }

  const { error: matchError } = await supabase.from('matches').insert({
    user_a: userA,
    user_b: userB,
    score: score ?? null,
  });

  if (matchError) {
    // Unique race — still a mutual
    return { created: true, mutual: true, alreadyMatched: false };
  }

  return { created: true, mutual: true, alreadyMatched: false };
}

export async function hasIncomingLike(myId: string, likerId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || isLocalDemoId(myId) || isLocalDemoId(likerId)) {
    return demoHasIncoming(myId, likerId);
  }

  const supabase = getSupabase();
  if (!supabase) return demoHasIncoming(myId, likerId);

  const { data } = await supabase
    .from('likes')
    .select('id')
    .eq('from_user_id', likerId)
    .eq('to_user_id', myId)
    .maybeSingle();

  return Boolean(data);
}

export async function listIncomingLikes(myId: string): Promise<LikeRecord[]> {
  if (!isSupabaseConfigured() || isLocalDemoId(myId)) {
    return demoListIncoming(myId);
  }

  const supabase = getSupabase();
  if (!supabase) return demoListIncoming(myId);

  const { data, error } = await supabase
    .from('likes')
    .select('from_user_id, to_user_id, created_at')
    .eq('to_user_id', myId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !data) return demoListIncoming(myId);

  return data.map((row) => ({
    fromUserId: row.from_user_id as string,
    toUserId: row.to_user_id as string,
    createdAt: row.created_at as string,
    read: false,
  }));
}

export async function dismissIncomingLike(myId: string, likerId: string): Promise<void> {
  // Demo-only dismiss; Supabase has no dismissed column — delete own reverse isn't applicable
  await demoDismiss(myId, likerId);

  if (!isSupabaseConfigured() || isLocalDemoId(myId)) return;
  // No server-side dismiss column; leave the remote like (they still liked us).
}

export async function markIncomingLikeRead(myId: string, likerId: string): Promise<void> {
  await demoMarkRead(myId, likerId);
}
