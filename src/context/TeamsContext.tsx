import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { Team, TeamJoinRequest } from '../data/mock';
import { ensureTeamChat, removeTeamChat } from '../lib/api/teamChats';
import {
  approveJoinRequest,
  createTeam,
  dissolveTeam,
  kickMember,
  listJoinRequestsForTeam,
  listTeams,
  membershipState,
  rejectJoinRequest,
  joinTeam,
  updateTeam,
  withMemberId,
  type CreateTeamInput,
  type TeamMembershipState,
  type UpdateTeamInput,
} from '../lib/api/teams';
import {
  bumpMyTeam,
  getMyTeamsOrder,
  sortTeamsByMyOrder,
} from '../lib/myTeamsOrder';
import { rememberProfile } from '../lib/profileDirectory';
import { useAuth } from './AuthContext';

type TeamsContextValue = {
  teams: Team[];
  /** Équipes dont je suis membre/chef, récentes / rejointes en premier. */
  myActiveTeams: Team[];
  joinRequests: TeamJoinRequest[];
  loading: boolean;
  refresh: () => Promise<void>;
  getMembership: (teamId: string) => TeamMembershipState;
  pendingForTeam: (teamId: string) => TeamJoinRequest[];
  create: (
    input: CreateTeamInput,
  ) => Promise<{ ok: true; team: Team } | { ok: false; error: string }>;
  update: (
    teamId: string,
    input: UpdateTeamInput,
  ) => Promise<{ ok: true; team: Team } | { ok: false; error: string }>;
  requestToJoin: (
    teamId: string,
  ) => Promise<
    | { ok: true; mode: 'joined' | 'requested' }
    | { ok: false; error: string }
  >;
  approveRequest: (requestId: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  rejectRequest: (requestId: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  removeMember: (
    teamId: string,
    memberId: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  dissolve: (teamId: string) => Promise<{ ok: true } | { ok: false; error: string }>;
};

const TeamsContext = createContext<TeamsContextValue | null>(null);

export function TeamsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamOrder, setTeamOrder] = useState<string[]>([]);
  const [joinRequests, setJoinRequests] = useState<TeamJoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const refreshSeq = useRef(0);

  const refresh = useCallback(async () => {
    const seq = ++refreshSeq.current;
    const userId = user?.id ?? null;
    const nextTeams = await listTeams(userId);
    if (seq !== refreshSeq.current) return;
    setTeams(nextTeams);
    if (userId) {
      const order = await getMyTeamsOrder(userId);
      if (seq !== refreshSeq.current) return;
      setTeamOrder(order);
    } else {
      setTeamOrder([]);
    }

    const allRequests: TeamJoinRequest[] = [];
    for (const team of nextTeams) {
      const reqs = await listJoinRequestsForTeam(team.id, userId);
      allRequests.push(...reqs);
    }
    if (seq !== refreshSeq.current) return;
    setJoinRequests(allRequests);
  }, [user?.id]);

  const myActiveTeams = useMemo(() => {
    if (!user?.id) return [];
    const mine = teams.filter(
      (t) => t.ownerId === user.id || t.memberIds.includes(user.id),
    );
    return sortTeamsByMyOrder(mine, teamOrder);
  }, [teams, teamOrder, user?.id]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        if (active) await refresh();
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [refresh]);

  const getMembership = useCallback(
    (teamId: string): TeamMembershipState => {
      const team = teams.find((t) => t.id === teamId);
      return membershipState(team, joinRequests, user?.id);
    },
    [teams, joinRequests, user?.id],
  );

  const pendingForTeam = useCallback(
    (teamId: string) =>
      joinRequests.filter((r) => r.teamId === teamId && r.status === 'pending'),
    [joinRequests],
  );

  const create = useCallback(
    async (input: CreateTeamInput) => {
      if (!user) return { ok: false as const, error: 'Connecte-toi pour créer une équipe.' };
      await rememberProfile(user).catch(() => undefined);
      const result = await createTeam(user.id, input);
      if (result.ok) {
        // Optimistic : le chef se voit tout de suite dans Membres.
        setTeams((prev) => {
          const next = withMemberId(result.team, user.id);
          const without = prev.filter((t) => t.id !== next.id);
          return [next, ...without];
        });
        await bumpMyTeam(user.id, result.team.id);
        setTeamOrder((prev) => [
          result.team.id,
          ...prev.filter((id) => id !== result.team.id),
        ]);
        await ensureTeamChat(result.team);
        try {
          const { notifyUser } = await import('../lib/notifications');
          await notifyUser({
            userId: user.id,
            title: 'Jumelo créé',
            body: `« ${result.team.name} » est en tête de tes jumelos.`,
            data: { type: 'team_created', teamId: result.team.id },
            kind: 'team',
            presentLocally: true,
          });
        } catch {
          // best-effort
        }
        await refresh();
      }
      return result;
    },
    [user, refresh],
  );

  const update = useCallback(
    async (teamId: string, input: UpdateTeamInput) => {
      if (!user) return { ok: false as const, error: 'Connecte-toi pour modifier.' };
      const result = await updateTeam(teamId, user.id, input);
      if (result.ok) {
        setTeams((prev) =>
          prev.map((t) => (t.id === teamId ? result.team : t)),
        );
        await refresh();
      }
      return result;
    },
    [user, refresh],
  );

  const requestToJoin = useCallback(
    async (teamId: string) => {
      if (!user) return { ok: false as const, error: 'Connecte-toi pour rejoindre.' };
      await rememberProfile(user).catch(() => undefined);
      const result = await joinTeam(teamId, user.id, {
        name: user.name,
        avatarColor: user.avatarColor,
        city: user.city,
        photo: user.photo,
      });
      if (result.ok) {
        if (result.mode === 'joined') {
          // Optimistic : s’afficher immédiatement dans le roster (fb-* inclus).
          setTeams((prev) =>
            prev.map((t) => (t.id === teamId ? withMemberId(t, user.id) : t)),
          );
          const team =
            teams.find((t) => t.id === teamId) ??
            (await listTeams(user.id)).find((t) => t.id === teamId);
          await bumpMyTeam(user.id, teamId);
          setTeamOrder((prev) => [teamId, ...prev.filter((id) => id !== teamId)]);
          if (team) {
            await ensureTeamChat(team);
            try {
              const { notifyTeamJoined } = await import('../lib/notifications');
              await notifyTeamJoined({
                userId: user.id,
                teamId,
                teamName: team.name,
                presentLocally: true,
              });
            } catch {
              // best-effort
            }
          }
        } else if (result.mode === 'requested') {
          // Optimistic : la carte lobby passe tout de suite en « en attente ».
          setJoinRequests((prev) => {
            const without = prev.filter(
              (r) => !(r.teamId === teamId && r.userId === user.id),
            );
            return [...without, result.request];
          });
          const team = teams.find((t) => t.id === teamId);
          try {
            const { notifyUser } = await import('../lib/notifications');
            await notifyUser({
              userId: user.id,
              title: 'Demande envoyée',
              body: team
                ? `Ta demande pour « ${team.name} » est partie au chef.`
                : 'Ta demande d’adhésion est partie au chef.',
              data: { type: 'team_join_pending', teamId },
              kind: 'team',
              presentLocally: true,
            });
          } catch {
            // best-effort
          }
        }
        await refresh();
        return { ok: true as const, mode: result.mode };
      }
      return result;
    },
    [user, refresh, teams],
  );

  const approveRequest = useCallback(
    async (requestId: string) => {
      if (!user) return { ok: false as const, error: 'Non connecté.' };
      const pending = joinRequests.find((r) => r.id === requestId);
      const result = await approveJoinRequest(requestId, user.id);
      if (result.ok) {
        if (pending) {
          setTeams((prev) =>
            prev.map((t) =>
              t.id === pending.teamId ? withMemberId(t, pending.userId) : t,
            ),
          );
        }
        await refresh();
      }
      return result;
    },
    [user, refresh, joinRequests],
  );

  const rejectRequest = useCallback(
    async (requestId: string) => {
      if (!user) return { ok: false as const, error: 'Non connecté.' };
      const result = await rejectJoinRequest(requestId, user.id);
      if (result.ok) await refresh();
      return result;
    },
    [user, refresh],
  );

  const removeMember = useCallback(
    async (teamId: string, memberId: string) => {
      if (!user) return { ok: false as const, error: 'Non connecté.' };
      const result = await kickMember(teamId, memberId, user.id);
      if (result.ok) await refresh();
      return result;
    },
    [user, refresh],
  );

  const dissolve = useCallback(
    async (teamId: string) => {
      if (!user) return { ok: false as const, error: 'Non connecté.' };
      const result = await dissolveTeam(teamId, user.id);
      if (result.ok) {
        await removeTeamChat(teamId);
        await refresh();
      }
      return result;
    },
    [user, refresh],
  );

  const value = useMemo(
    () => ({
      teams,
      myActiveTeams,
      joinRequests,
      loading,
      refresh,
      getMembership,
      pendingForTeam,
      create,
      update,
      requestToJoin,
      approveRequest,
      rejectRequest,
      removeMember,
      dissolve,
    }),
    [
      teams,
      myActiveTeams,
      joinRequests,
      loading,
      refresh,
      getMembership,
      pendingForTeam,
      create,
      update,
      requestToJoin,
      approveRequest,
      rejectRequest,
      removeMember,
      dissolve,
    ],
  );

  return <TeamsContext.Provider value={value}>{children}</TeamsContext.Provider>;
}

export function useTeams() {
  const ctx = useContext(TeamsContext);
  if (!ctx) {
    throw new Error('useTeams must be used within TeamsProvider');
  }
  return ctx;
}
