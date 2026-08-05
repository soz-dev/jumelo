import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { safeBack } from '../../../src/lib/navigation';
import { CategoryIcon } from '../../../src/components/CategoryIcon';
import { DuoRankPanel } from '../../../src/components/DuoRankBadge';
import { Avatar, Button, Subtitle, Title } from '../../../src/components/ui';
import { fonts, radii, spacing, withHexAlpha } from '../../../src/constants/theme';
import { useAuth } from '../../../src/context/AuthContext';
import { useTeams } from '../../../src/context/TeamsContext';
import { useTheme } from '../../../src/context/ThemeContext';
import { mockUsers, type UserProfile } from '../../../src/data/mock';
import { ensureTeamChat } from '../../../src/lib/api/teamChats';
import {
  emptyDuoScore,
  getDuoScore,
  type DuoScore,
} from '../../../src/lib/duoPoints';
import {
  clearSessionsForTeam,
  endTeamSession,
  getLatestSession,
  getPendingRatingSession,
  sessionUiStatus,
  startTeamSession,
  type TeamSession,
  type TeamSessionStatus,
} from '../../../src/lib/teamSessions';
import {
  resolveUserById,
  resolveUsersByIds,
  stubProfileFromId,
} from '../../../src/lib/users';

function memberMetaLine(member: UserProfile): string {
  const parts = [
    member.age ? `${member.age} ans` : null,
    member.city?.trim() || null,
    member.vibes?.length ? member.vibes.join(' · ') : null,
  ].filter(Boolean);
  return parts.join(' · ') || 'Profil Jumelo';
}

/** Profil immédiat (sync) — le user courant n’attend pas la résolution async. */
function syncProfileForId(
  id: string,
  currentUser: UserProfile | null | undefined,
): UserProfile {
  if (currentUser && currentUser.id === id) return currentUser;
  const mock = mockUsers.find((u) => u.id === id);
  if (mock) return mock;
  return stubProfileFromId(id);
}

export default function TeamDetailScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    teams,
    loading,
    refresh,
    getMembership,
    pendingForTeam,
    requestToJoin,
    approveRequest,
    rejectRequest,
    removeMember,
    dissolve,
  } = useTeams();

  const [busy, setBusy] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [session, setSession] = useState<TeamSession | null>(null);
  const [pendingRateSession, setPendingRateSession] = useState<TeamSession | null>(null);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [duoScore, setDuoScore] = useState<DuoScore>(emptyDuoScore());
  const [enrichedById, setEnrichedById] = useState<Record<string, UserProfile>>({});
  const [pendingProfiles, setPendingProfiles] = useState<Record<string, UserProfile>>(
    {},
  );

  const reloadSession = useCallback(async () => {
    if (!id) {
      setSession(null);
      setPendingRateSession(null);
      return;
    }
    const latest = await getLatestSession(id);
    setSession(latest);
    if (user?.id) {
      const pending = await getPendingRatingSession(id, user.id);
      setPendingRateSession(pending);
    } else {
      setPendingRateSession(null);
    }
  }, [id, user?.id]);

  const reloadDuoScore = useCallback(async () => {
    if (!id) {
      setDuoScore(emptyDuoScore());
      return;
    }
    const score = await getDuoScore(id);
    setDuoScore(score);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      refresh().catch(() => undefined);
      reloadSession().catch(() => undefined);
      reloadDuoScore().catch(() => undefined);
    }, [refresh, reloadSession, reloadDuoScore]),
  );

  const team = teams.find((t) => t.id === id);
  const membership = getMembership(id ?? '');
  const isOwner = membership === 'owner';
  const pending = pendingForTeam(id ?? '');
  const pendingIdsKey = pending.map((r) => r.userId).join('|');

  /** Ids roster : memberIds + self si membre/chef (évite de disparaître après join). */
  const rosterIds = useMemo(() => {
    if (!team) return [] as string[];
    const ids = [...team.memberIds];
    if (
      user?.id &&
      (membership === 'member' || membership === 'owner') &&
      !ids.includes(user.id)
    ) {
      ids.push(user.id);
    }
    if (team.ownerId && !ids.includes(team.ownerId)) {
      ids.unshift(team.ownerId);
    }
    return ids;
  }, [team, membership, user?.id]);

  const rosterIdsKey = rosterIds.join('|');

  const members = useMemo(
    () =>
      rosterIds.map((memberId) => {
        if (user?.id === memberId) return user;
        const enriched = enrichedById[memberId];
        if (enriched) return enriched;
        return syncProfileForId(memberId, user);
      }),
    [rosterIds, user, enrichedById],
  );

  const owner = useMemo(() => {
    if (!team?.ownerId) return undefined;
    return (
      members.find((m) => m.id === team.ownerId) ??
      syncProfileForId(team.ownerId, user)
    );
  }, [team?.ownerId, members, user]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!rosterIds.length) {
        if (active) setEnrichedById({});
        return;
      }
      try {
        const resolved = await resolveUsersByIds(rosterIds);
        if (!active) return;
        const next: Record<string, UserProfile> = {};
        for (const profile of resolved) {
          next[profile.id] =
            user && profile.id === user.id
              ? { ...profile, ...user, id: user.id }
              : profile;
        }
        setEnrichedById(next);
      } catch {
        // garder le roster sync (self + mocks + stubs)
      }
    })();
    return () => {
      active = false;
    };
  }, [rosterIdsKey, user]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!pending.length) {
        if (active) setPendingProfiles({});
        return;
      }
      try {
        const entries = await Promise.all(
          pending.map(async (req) => {
            const resolved = await resolveUserById(req.userId);
            const profile: UserProfile = {
              ...(resolved ?? syncProfileForId(req.userId, user)),
              name: req.userName?.trim() || resolved?.name || 'Membre',
              avatarColor: req.avatarColor ?? resolved?.avatarColor ?? colors.primary,
              city: req.city ?? resolved?.city ?? '',
              photo: req.photo ?? resolved?.photo,
            };
            return [req.userId, profile] as const;
          }),
        );
        if (active) setPendingProfiles(Object.fromEntries(entries));
      } catch {
        if (active) setPendingProfiles({});
      }
    })();
    return () => {
      active = false;
    };
  }, [pendingIdsKey, pending, colors.primary, user]);

  const onRequestJoin = async () => {
    if (!id) return;
    setBusy(true);
    const result = await requestToJoin(id);
    setBusy(false);
    if (!result.ok) {
      Alert.alert('Impossible', result.error);
      return;
    }
    if (result.mode === 'joined') {
      Alert.alert(
        'Bienvenue !',
        team
          ? `Tu as rejoint « ${team.name} ». Il est en tête de tes jumelos.`
          : 'Tu as rejoint le jumelo. Il est en tête de ta liste.',
      );
    } else {
      Alert.alert(
        'Demande envoyée',
        team
          ? `Ta demande pour « ${team.name} » est partie au chef.`
          : 'Le chef a été notifié. Tu seras membre après approbation.',
      );
    }
  };

  const onApprove = async (requestId: string) => {
    setActionId(requestId);
    const result = await approveRequest(requestId);
    setActionId(null);
    if (!result.ok) Alert.alert('Impossible', result.error);
  };

  const onReject = async (requestId: string) => {
    setActionId(requestId);
    const result = await rejectRequest(requestId);
    setActionId(null);
    if (!result.ok) Alert.alert('Impossible', result.error);
  };

  const onKick = (memberId: string, memberName: string) => {
    if (!id) return;
    Alert.alert(
      'Exclure du jumelo',
      `Retirer ${memberName} du jumelo ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Exclure',
          style: 'destructive',
          onPress: async () => {
            setActionId(memberId);
            const result = await removeMember(id, memberId);
            setActionId(null);
            if (!result.ok) Alert.alert('Impossible', result.error);
          },
        },
      ],
    );
  };

  const sessionStatus: TeamSessionStatus = sessionUiStatus(session);
  const isMemberOrOwner = membership === 'member' || membership === 'owner';
  const canStartSession =
    isOwner && sessionStatus !== 'active' && (team?.memberIds.length ?? 0) >= 2;
  const canEndSession = isOwner && sessionStatus === 'active';

  const onStartSession = async () => {
    if (!id || !team || !user) return;
    setSessionBusy(true);
    const result = await startTeamSession({
      teamId: id,
      ownerId: team.ownerId,
      actorId: user.id,
      memberIds: team.memberIds,
    });
    setSessionBusy(false);
    if (!result.ok) {
      Alert.alert('Impossible', result.error);
      return;
    }
    await reloadSession();
    await reloadDuoScore();
    Alert.alert('Session démarrée', 'Bonne session — le chef pourra la terminer quand vous aurez fini.');
  };

  const onEndSession = () => {
    if (!id || !team || !user) return;
    Alert.alert(
      'Terminer la session',
      'Chacun pourra ensuite noter anonymement les autres coéquipiers.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Terminer',
          onPress: async () => {
            setSessionBusy(true);
            const result = await endTeamSession({
              teamId: id,
              ownerId: team.ownerId,
              actorId: user.id,
              memberIds: team.memberIds,
            });
            setSessionBusy(false);
            if (!result.ok) {
              Alert.alert('Impossible', result.error);
              return;
            }
            await reloadSession();
            await reloadDuoScore();
            router.push(`/team/${id}/rate?sessionId=${result.session.id}`);
          },
        },
      ],
    );
  };

  const onDissolve = () => {
    if (!id || !team) return;
    Alert.alert(
      'Dissoudre le jumelo',
      `« ${team.name} » sera définitivement supprimé. Continuer ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Dissoudre',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            const result = await dissolve(id);
            if (result.ok) await clearSessionsForTeam(id);
            setBusy(false);
            if (!result.ok) {
              Alert.alert('Impossible', result.error);
              return;
            }
            router.replace('/(tabs)/teams');
          },
        },
      ],
    );
  };

  const onOpenGroupChat = async () => {
    if (!team) return;
    setBusy(true);
    try {
      const chat = await ensureTeamChat(team);
      router.push(`/chat/${chat.id}`);
    } finally {
      setBusy(false);
    }
  };

  if (loading && !team) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.cream }]}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      </SafeAreaView>
    );
  }

  if (!team) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.cream }]}>
        <Text style={{ color: colors.primary }} onPress={() => safeBack('/(tabs)/teams')}>
          ← Retour
        </Text>
        <Title>Introuvable</Title>
        <Subtitle>Ce jumelo a peut‑être été dissous.</Subtitle>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.cream }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => safeBack('/(tabs)/teams')}>
          <Text style={{ color: colors.primary, fontFamily: fonts.bodyMedium }}>← Retour</Text>
        </Pressable>

        <View style={[styles.hero, { backgroundColor: colors.white }]}>
          <CategoryIcon universeId={team.universe} size={56} />
          <Text
            style={{
              color: colors.primaryDark,
              fontFamily: fonts.bodyBold,
              fontSize: 11,
              letterSpacing: 1.2,
              marginBottom: 6,
            }}
          >
            JUMELO
          </Text>
          <Title style={{ fontSize: 28 }}>{team.name}</Title>
          <Subtitle>
            {team.activity} · {team.nextSession}
          </Subtitle>
          <Text style={[styles.blurb, { color: colors.ink }]}>{team.blurb}</Text>
          <Text style={{ color: colors.inkMuted, fontFamily: fonts.body, marginTop: 8 }}>
            {team.city} · {team.membersCount}/{team.capacity}
            {' · '}
            {team.vibe}
            {' · '}
            {team.locked ? 'Sur demande' : 'Entrée libre'}
          </Text>
          {owner ? (
            <View style={styles.chefRow}>
              <Ionicons name="shield-outline" size={16} color={colors.primary} />
              <Text style={{ color: colors.inkMuted, fontFamily: fonts.bodyMedium }}>
                Chef : {owner.name}
                {owner.id === user?.id ? ' (toi)' : ''}
              </Text>
            </View>
          ) : null}
        </View>

        <DuoRankPanel
          rank={duoScore.rank}
          sessionsEnded={duoScore.sessionsEnded}
          averageRating={duoScore.averageRating}
          ratingCount={duoScore.ratingCount}
        />

        {isMemberOrOwner ? (
          <View
            style={[
              styles.sessionCard,
              {
                backgroundColor: colors.white,
                borderColor:
                  sessionStatus === 'active'
                    ? colors.primary
                    : sessionStatus === 'ended'
                      ? colors.warning
                      : colors.border,
              },
            ]}
          >
            <View style={styles.sessionHead}>
              <Ionicons
                name={
                  sessionStatus === 'active'
                    ? 'play-circle'
                    : sessionStatus === 'ended'
                      ? 'flag'
                      : 'ellipse-outline'
                }
                size={22}
                color={
                  sessionStatus === 'active'
                    ? colors.primary
                    : sessionStatus === 'ended'
                      ? colors.warning
                      : colors.inkMuted
                }
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.sessionTitle, { color: colors.ink }]}>
                  {sessionStatus === 'active'
                    ? 'Session en cours'
                    : sessionStatus === 'ended'
                      ? 'Session terminée'
                      : 'Aucune session'}
                </Text>
                <Text style={{ color: colors.inkMuted, fontFamily: fonts.body, fontSize: 13 }}>
                  {sessionStatus === 'active'
                    ? 'Le chef peut terminer quand vous avez fini.'
                    : sessionStatus === 'ended'
                      ? 'Note les coéquipiers anonymement, puis le chef pourra relancer.'
                      : isOwner
                        ? 'Démarre une session quand l’équipe est prête (min. 2 membres).'
                        : 'En attente que le chef démarre une session.'}
                </Text>
              </View>
            </View>

            {canStartSession ? (
              <Button
                label="Démarrer la session"
                onPress={onStartSession}
                loading={sessionBusy}
                icon="play-outline"
                style={{ marginTop: spacing.sm }}
              />
            ) : null}

            {isOwner && sessionStatus !== 'active' && (team.memberIds.length ?? 0) < 2 ? (
              <Text style={[styles.sessionHint, { color: colors.inkMuted }]}>
                Invite au moins un coéquipier pour démarrer.
              </Text>
            ) : null}

            {canEndSession ? (
              <Button
                label="Terminer la session"
                variant="accent"
                onPress={onEndSession}
                loading={sessionBusy}
                icon="flag-outline"
                style={{ marginTop: spacing.sm }}
              />
            ) : null}

            {pendingRateSession && isMemberOrOwner ? (
              <Button
                label="Noter les coéquipiers"
                variant="secondary"
                onPress={() =>
                  router.push(
                    `/team/${id}/rate?sessionId=${pendingRateSession.id}`,
                  )
                }
                style={{ marginTop: spacing.sm }}
                icon="star-outline"
              />
            ) : null}
          </View>
        ) : null}

        {membership === 'pending' ? (
          <View
            style={[
              styles.banner,
              {
                backgroundColor: withHexAlpha(colors.white, 0.72),
                borderColor: withHexAlpha(colors.primary, 0.35),
                borderWidth: 1.5,
              },
            ]}
          >
            <Ionicons name="time-outline" size={20} color={colors.primary} />
            <Text style={{ color: colors.ink, fontFamily: fonts.bodyMedium, flex: 1 }}>
              Demande envoyée — en attente de réponse
            </Text>
          </View>
        ) : null}

        {membership === 'rejected' ? (
          <View style={[styles.banner, { backgroundColor: colors.white, borderColor: colors.border, borderWidth: 1 }]}>
            <Ionicons name="close-circle-outline" size={20} color={colors.accent} />
            <Text style={{ color: colors.ink, fontFamily: fonts.bodyMedium, flex: 1 }}>
              Demande refusée. Tu peux redemander.
            </Text>
          </View>
        ) : null}

        {isOwner && pending.length > 0 ? (
          <>
            <Text style={[styles.section, { color: colors.ink }]}>
              Demandes en attente ({pending.length})
            </Text>
            {pending.map((req) => {
              const requester = pendingProfiles[req.userId];
              const name = requester?.name ?? req.userName?.trim() ?? 'Membre';
              return (
                <View
                  key={req.id}
                  style={[styles.member, { backgroundColor: colors.white }]}
                >
                  <Avatar
                    name={name}
                    color={requester?.avatarColor ?? req.avatarColor ?? colors.primary}
                    photo={requester?.photo ?? req.photo}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.memberName, { color: colors.ink }]}>{name}</Text>
                    <Text style={{ color: colors.inkMuted, fontFamily: fonts.body }}>
                      Veut rejoindre
                      {requester?.city ? ` · ${requester.city}` : ''}
                    </Text>
                  </View>
                  {actionId === req.id ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <View style={styles.reqActions}>
                      <Pressable
                        style={[styles.iconBtn, { backgroundColor: colors.primary }]}
                        onPress={() => onApprove(req.id)}
                      >
                        <Ionicons name="checkmark" size={18} color="#fff" />
                      </Pressable>
                      <Pressable
                        style={[styles.iconBtn, { backgroundColor: colors.accent }]}
                        onPress={() => onReject(req.id)}
                      >
                        <Ionicons name="close" size={18} color="#fff" />
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}
          </>
        ) : null}

        <Text style={[styles.section, { color: colors.ink }]}>Membres</Text>
        {members.map((member) => (
          <View
            key={member.id}
            style={[styles.member, { backgroundColor: colors.white }]}
          >
            <Pressable
              style={styles.memberMain}
              onPress={() => router.push(`/user/${member.id}`)}
            >
              <Avatar
                name={member.name}
                color={member.avatarColor}
                photo={member.photo}
              />
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={[styles.memberName, { color: colors.ink }]}>
                    {member.name}
                    {member.id === user?.id ? ' (toi)' : ''}
                  </Text>
                  {member.id === team.ownerId ? (
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor: withHexAlpha(colors.white, 0.72),
                          borderColor: withHexAlpha(colors.primary, 0.4),
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: colors.primary,
                          fontFamily: fonts.bodyMedium,
                          fontSize: 11,
                        }}
                      >
                        Chef
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={{ color: colors.inkMuted, fontFamily: fonts.body }}>
                  {memberMetaLine(member)}
                </Text>
              </View>
            </Pressable>
            {isOwner && member.id !== team.ownerId ? (
              actionId === member.id ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <Pressable
                  hitSlop={8}
                  onPress={() => onKick(member.id, member.name)}
                  style={[styles.kickBtn, { borderColor: colors.border }]}
                >
                  <Ionicons name="exit-outline" size={18} color={colors.accent} />
                </Pressable>
              )
            ) : null}
          </View>
        ))}

        {membership === 'none' || membership === 'rejected' ? (
          <Button
            label={
              team.locked
                ? 'Demander à rejoindre le jumelo'
                : 'Rejoindre le jumelo'
            }
            onPress={onRequestJoin}
            loading={busy}
            style={{ marginTop: spacing.xl }}
            icon={team.locked ? 'hand-left-outline' : 'enter-outline'}
          />
        ) : null}

        {membership === 'member' || membership === 'owner' ? (
          <Button
            label="Ouvrir le chat du jumelo"
            onPress={onOpenGroupChat}
            loading={busy}
            style={{ marginTop: spacing.xl }}
            icon="chatbubbles-outline"
          />
        ) : null}

        {isOwner ? (
          <Button
            label="Modifier le jumelo"
            onPress={() =>
              router.push({
                pathname: '/team/create',
                params: { editId: team.id },
              })
            }
            style={{ marginTop: spacing.xl }}
            icon="create-outline"
          />
        ) : null}

        {isOwner ? (
          <Button
            label="Dissoudre le jumelo"
            variant="accent"
            onPress={onDissolve}
            loading={busy}
            style={{ marginTop: spacing.md }}
            icon="trash-outline"
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  hero: {
    marginTop: spacing.md,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  blurb: { fontFamily: fonts.body, lineHeight: 22, marginTop: spacing.sm },
  chefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  sessionCard: {
    marginTop: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1.5,
    padding: spacing.md,
  },
  sessionHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  sessionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
  },
  sessionHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: spacing.sm,
  },
  banner: {
    marginTop: spacing.md,
    borderRadius: radii.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  section: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    fontFamily: fonts.displaySemi,
    fontSize: 20,
  },
  member: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  memberMain: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  memberName: { fontFamily: fonts.bodyBold, fontSize: 16 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    borderRadius: radii.pill,
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  reqActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kickBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
