import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  requestJoin,
  type CreateTeamInput,
  type TeamMembershipState,
} from '../lib/api/teams';
import { useAuth } from './AuthContext';

type TeamsContextValue = {
  teams: Team[];
  joinRequests: TeamJoinRequest[];
  loading: boolean;
  refresh: () => Promise<void>;
  getMembership: (teamId: string) => TeamMembershipState;
  pendingForTeam: (teamId: string) => TeamJoinRequest[];
  create: (
    input: CreateTeamInput,
  ) => Promise<{ ok: true; team: Team } | { ok: false; error: string }>;
  requestToJoin: (teamId: string) => Promise<{ ok: true } | { ok: false; error: string }>;
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
  const [joinRequests, setJoinRequests] = useState<TeamJoinRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const userId = user?.id ?? null;
    const nextTeams = await listTeams(userId);
    setTeams(nextTeams);

    const allRequests: TeamJoinRequest[] = [];
    for (const team of nextTeams) {
      const reqs = await listJoinRequestsForTeam(team.id, userId);
      allRequests.push(...reqs);
    }
    setJoinRequests(allRequests);
  }, [user?.id]);

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
      const result = await createTeam(user.id, input);
      if (result.ok) {
        await ensureTeamChat(result.team);
        await refresh();
      }
      return result;
    },
    [user, refresh],
  );

  const requestToJoin = useCallback(
    async (teamId: string) => {
      if (!user) return { ok: false as const, error: 'Connecte-toi pour rejoindre.' };
      const result = await requestJoin(teamId, user.id);
      if (result.ok) await refresh();
      return result.ok ? { ok: true as const } : result;
    },
    [user, refresh],
  );

  const approveRequest = useCallback(
    async (requestId: string) => {
      if (!user) return { ok: false as const, error: 'Non connecté.' };
      const result = await approveJoinRequest(requestId, user.id);
      if (result.ok) await refresh();
      return result;
    },
    [user, refresh],
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
      joinRequests,
      loading,
      refresh,
      getMembership,
      pendingForTeam,
      create,
      requestToJoin,
      approveRequest,
      rejectRequest,
      removeMember,
      dissolve,
    }),
    [
      teams,
      joinRequests,
      loading,
      refresh,
      getMembership,
      pendingForTeam,
      create,
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
