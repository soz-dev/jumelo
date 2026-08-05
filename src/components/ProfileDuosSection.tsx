import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { CategoryIcon } from './CategoryIcon';
import { DuoRankBadge } from './DuoRankBadge';
import { JumeloRenameModal } from './JumeloRenameModal';
import type { Team, UserProfile } from '../data/mock';
import { useAuth } from '../context/AuthContext';
import { useTeams } from '../context/TeamsContext';
import { useTheme } from '../context/ThemeContext';
import {
  Avatar,
  elevation,
  fonts,
  radii,
  spacing,
  withHexAlpha,
} from '../design-system';
import { ensureTeamChat } from '../lib/api/teamChats';
import { listTeams, renameJumeloName } from '../lib/api/teams';
import {
  DUO_POINT_RULES,
  emptyDuoScore,
  getDuoScoresByTeamIds,
  type DuoScore,
} from '../lib/duoPoints';
import {
  getJumeloValidationsByTeamIds,
  isFormedJumelo,
  isJumeloValidated,
  type JumeloValidationRecord,
} from '../lib/jumeloValidation';
import { resolveUsersByIds } from '../lib/users';

type DuoCardModel = {
  team: Team;
  partner: UserProfile | null;
  score: DuoScore;
  validation: JumeloValidationRecord | null;
};

type Props = {
  userId: string;
  /** Équipes déjà chargées (profil perso via TeamsContext). */
  teams?: Team[];
  /** Titre section — défaut « Tes jumelos » / « Jumelos » selon `possessive`. */
  title?: string;
  possessive?: boolean;
  /** Nombre max de cartes (défaut 6). */
  limit?: number;
};

function partnerIdFor(team: Team, userId: string): string | null {
  const others = team.memberIds.filter((id) => id && id !== userId);
  if (others.length > 0) return others[0];
  if (team.ownerId && team.ownerId !== userId) return team.ownerId;
  return null;
}

function formatPoints(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}k`;
  return String(n);
}

function validationStatus(
  item: DuoCardModel,
): 'solo' | 'pending' | 'validated' {
  if (!isFormedJumelo(item.team)) return 'solo';
  if (isJumeloValidated(item.validation)) return 'validated';
  return 'pending';
}

function DuoCard({
  item,
  index,
  canEdit,
  onRename,
}: {
  item: DuoCardModel;
  index: number;
  canEdit: boolean;
  onRename: (team: Team) => void;
}) {
  const { colors } = useTheme();
  const { team, partner, score } = item;
  const status = validationStatus(item);
  const hasPartner = Boolean(partner);
  const validated = status === 'validated';
  const sessionsLabel =
    score.sessionsEnded > 0
      ? `${score.sessionsEnded} session${score.sessionsEnded > 1 ? 's' : ''}`
      : score.sessionsActive > 0
        ? 'Session en cours'
        : 'Pas encore de session';

  const statusLabel =
    status === 'solo'
      ? 'Cherche partenaire'
      : status === 'pending'
        ? 'En attente de validation'
        : 'Jumelo validé';

  const statusColor =
    status === 'validated'
      ? colors.primaryDark
      : status === 'pending'
        ? '#8A6B10'
        : colors.inkMuted;

  return (
    <Animated.View entering={FadeInDown.delay(40 + index * 50).duration(320)}>
      <Pressable
        onPress={() => router.push(`/team/${team.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`Jumelo ${team.name}, ${statusLabel}${
          validated ? `, ${score.rank.displayName}, niveau ${score.rank.level}` : ''
        }`}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.white,
            borderColor: validated
              ? withHexAlpha(score.rank.color, 0.35)
              : withHexAlpha(colors.primary, status === 'pending' ? 0.28 : 0.16),
            opacity: pressed ? 0.92 : 1,
          },
          validated
            ? elevation.glow(withHexAlpha(score.rank.color, 0.28))
            : undefined,
        ]}
      >
        {validated ? (
          <LinearGradient
            colors={[
              withHexAlpha(score.rank.color, 0.14),
              'transparent',
              withHexAlpha(colors.primary, 0.05),
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        ) : null}

        <View style={styles.cardTop}>
          <View style={styles.partnerBlock}>
            {hasPartner ? (
              <Avatar
                name={partner!.name}
                photo={partner!.photo}
                personaId={partner!.avatarPersonaId}
                color={partner!.avatarColor}
                size={52}
                online={partner!.online}
              />
            ) : (
              <View
                style={[
                  styles.emptyAvatar,
                  {
                    backgroundColor: withHexAlpha(colors.primary, 0.12),
                    borderColor: withHexAlpha(colors.primary, 0.28),
                  },
                ]}
              >
                <Ionicons name="person-add-outline" size={22} color={colors.primary} />
              </View>
            )}
            <View style={styles.partnerMeta}>
              <Text style={[styles.jumeloName, { color: colors.ink }]} numberOfLines={1}>
                {team.name}
              </Text>
              <Text style={[styles.partnerName, { color: colors.inkMuted }]} numberOfLines={1}>
                {partner?.name ?? 'Cherche partenaire'}
                {team.activity ? ` · ${team.activity}` : ''}
              </Text>
              <View style={styles.metaRow}>
                <CategoryIcon universeId={team.universe} size={18} />
                <Text style={[styles.statusPill, { color: statusColor }]} numberOfLines={1}>
                  {statusLabel}
                  {validated && score.ratingCount > 0
                    ? ` · ${score.averageRating.toFixed(1)}★`
                    : validated
                      ? ` · ${sessionsLabel}`
                      : ''}
                </Text>
              </View>
            </View>
          </View>

          {validated ? (
            <View
              style={[
                styles.pointsBadge,
                { backgroundColor: score.rank.color },
              ]}
            >
              <Text style={styles.pointsValue}>{formatPoints(score.points)}</Text>
              <Text style={styles.pointsUnit}>XP</Text>
            </View>
          ) : (
            <View
              style={[
                styles.pendingBadge,
                {
                  backgroundColor:
                    status === 'pending'
                      ? withHexAlpha('#C9A227', 0.18)
                      : withHexAlpha(colors.primary, 0.1),
                },
              ]}
            >
              <Ionicons
                name={status === 'pending' ? 'hourglass-outline' : 'people-outline'}
                size={18}
                color={statusColor}
              />
            </View>
          )}
        </View>

        {validated ? (
          <DuoRankBadge rank={score.rank} size="sm" showLevelBar showTitle />
        ) : status === 'pending' ? (
          <Text style={[styles.pendingHint, { color: colors.inkFaint }]}>
            Validez tous les deux depuis le chat pour afficher rang & XP sur vos profils.
          </Text>
        ) : null}

        <View style={styles.cardFooter}>
          <Text style={[styles.slots, { color: colors.primaryDark }]}>
            {team.membersCount}/{team.capacity}
          </Text>
          {validated && canEdit ? (
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                onRename(team);
              }}
              hitSlop={8}
              style={styles.renameBtn}
              accessibilityRole="button"
              accessibilityLabel="Renommer le jumelo"
            >
              <Ionicons name="pencil" size={14} color={colors.primaryDark} />
              <Text style={[styles.renameLabel, { color: colors.primaryDark }]}>
                Renommer
              </Text>
            </Pressable>
          ) : status === 'pending' && canEdit ? (
            <Pressable
              onPress={async (e) => {
                e.stopPropagation?.();
                const chat = await ensureTeamChat(team);
                router.push(`/chat/${chat.id}`);
              }}
              hitSlop={8}
              style={styles.renameBtn}
              accessibilityRole="button"
              accessibilityLabel="Ouvrir le chat du jumelo"
            >
              <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.primaryDark} />
              <Text style={[styles.renameLabel, { color: colors.primaryDark }]}>
                Chat
              </Text>
            </Pressable>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function ProfileDuosSection({
  userId,
  teams: teamsProp,
  title,
  possessive = true,
  limit = 6,
}: Props) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { refresh } = useTeams();
  const [remoteTeams, setRemoteTeams] = useState<Team[]>([]);
  const [scores, setScores] = useState<Map<string, DuoScore>>(new Map());
  const [partners, setPartners] = useState<Map<string, UserProfile>>(new Map());
  const [validations, setValidations] = useState<
    Map<string, JumeloValidationRecord>
  >(new Map());
  const [ready, setReady] = useState(false);
  const [renameTeam, setRenameTeam] = useState<Team | null>(null);
  const [nameOverrides, setNameOverrides] = useState<Record<string, string>>({});

  const sourceTeams = teamsProp ?? remoteTeams;
  const canEdit = Boolean(user?.id && user.id === userId);

  const duos = useMemo(() => {
    return sourceTeams
      .filter((t) => t.capacity <= 2)
      .filter((t) => t.ownerId === userId || t.memberIds.includes(userId))
      .map((t) =>
        nameOverrides[t.id] ? { ...t, name: nameOverrides[t.id] } : t,
      );
  }, [sourceTeams, userId, nameOverrides]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const teams =
          teamsProp ??
          (await listTeams(userId)).filter(
            (t) =>
              t.capacity <= 2 &&
              (t.ownerId === userId || t.memberIds.includes(userId)),
          );
        if (!active) return;
        if (!teamsProp) setRemoteTeams(teams);

        const duoList = teams.filter((t) => t.capacity <= 2);
        const [scoreMap, validationMap] = await Promise.all([
          getDuoScoresByTeamIds(duoList.map((t) => t.id)),
          getJumeloValidationsByTeamIds(duoList.map((t) => t.id)),
        ]);
        if (!active) return;
        setScores(scoreMap);
        setValidations(validationMap);

        const peerIds = duoList
          .map((t) => partnerIdFor(t, userId))
          .filter((id): id is string => Boolean(id));
        const resolved = await resolveUsersByIds(peerIds);
        if (!active) return;
        const byId = new Map<string, UserProfile>();
        resolved.forEach((p) => byId.set(p.id, p));
        setPartners(byId);
        setReady(true);
      })();
      return () => {
        active = false;
      };
    }, [userId, teamsProp]),
  );

  const cards: DuoCardModel[] = useMemo(() => {
    return duos
      .map((team) => {
        const pid = partnerIdFor(team, userId);
        const validation = validations.get(team.id) ?? null;
        return {
          team,
          partner: pid ? partners.get(pid) ?? null : null,
          score: scores.get(team.id) ?? emptyDuoScore(),
          validation,
        };
      })
      .sort((a, b) => {
        const av = isJumeloValidated(a.validation) ? 1 : 0;
        const bv = isJumeloValidated(b.validation) ? 1 : 0;
        if (av !== bv) return bv - av;
        return (
          b.score.points - a.score.points ||
          b.team.membersCount - a.team.membersCount
        );
      })
      .slice(0, limit);
  }, [duos, partners, scores, validations, userId, limit]);

  const validatedCards = cards.filter((c) => isJumeloValidated(c.validation));
  const pendingCount = cards.filter(
    (c) => isFormedJumelo(c.team) && !isJumeloValidated(c.validation),
  ).length;

  const totalPoints = validatedCards.reduce((sum, c) => sum + c.score.points, 0);
  const bestRank = validatedCards.reduce<DuoScore['rank'] | null>((best, c) => {
    if (!best || c.score.rank.rankIndex > best.rankIndex) return c.score.rank;
    if (
      c.score.rank.rankIndex === best.rankIndex &&
      c.score.rank.level > best.level
    ) {
      return c.score.rank;
    }
    return best;
  }, null);
  const sectionTitle =
    title ?? (possessive ? 'Tes jumelos' : 'Jumelos');

  const onRenameSave = async (name: string) => {
    if (!user?.id || !renameTeam) {
      return { ok: false as const, error: 'Connecte-toi pour renommer.' };
    }
    const result = await renameJumeloName(renameTeam.id, user.id, name);
    if (!result.ok) return result;
    setNameOverrides((prev) => ({ ...prev, [result.team.id]: result.team.name }));
    setRemoteTeams((prev) =>
      prev.map((t) => (t.id === result.team.id ? result.team : t)),
    );
    await ensureTeamChat(result.team);
    await refresh();
    setRenameTeam(result.team);
    return { ok: true as const };
  };

  if (!ready && !teamsProp) {
    return null;
  }

  const bannerSub =
    cards.length === 0
      ? 'Validez ensemble pour sceller votre jumelo'
      : validatedCards.length > 0 && bestRank
        ? `${validatedCards.length} validé${validatedCards.length > 1 ? 's' : ''} · meilleur ${bestRank.displayName}${
            pendingCount > 0 ? ` · ${pendingCount} en attente` : ''
          }`
        : pendingCount > 0
          ? `${pendingCount} en attente de validation`
          : `${cards.length} jumelo${cards.length > 1 ? 's' : ''}`;

  return (
    <View style={styles.section}>
      <LinearGradient
        colors={[colors.primaryDark, colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.banner, elevation.glow(colors.primary)]}
      >
        <View style={styles.bannerText}>
          <View style={styles.bannerTitleRow}>
            <Ionicons name="people" size={20} color="#fff" />
            <Text style={styles.bannerTitle}>{sectionTitle}</Text>
          </View>
          <Text style={styles.bannerSub}>{bannerSub}</Text>
        </View>
        <View style={styles.bannerScore}>
          <Text style={styles.bannerPts}>{formatPoints(totalPoints)}</Text>
          <Text style={styles.bannerPtsLabel}>XP</Text>
        </View>
      </LinearGradient>

      {cards.length === 0 ? (
        <Pressable
          onPress={() => router.push('/(tabs)/teams')}
          style={[
            styles.empty,
            {
              backgroundColor: colors.white,
              borderColor: withHexAlpha(colors.primary, 0.2),
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Créer un jumelo"
        >
          <View
            style={[
              styles.emptyIcon,
              { backgroundColor: withHexAlpha(colors.primary, 0.12) },
            ]}
          >
            <Ionicons name="people-outline" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.emptyTitle, { color: colors.ink }]}>
              Aucun jumelo pour l’instant
            </Text>
            <Text style={[styles.emptySub, { color: colors.inkMuted }]}>
              Crée un jumelo, discutez, puis validez-le ensemble.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
        </Pressable>
      ) : (
        <View style={styles.list}>
          {cards.map((item, i) => (
            <DuoCard
              key={item.team.id}
              item={item}
              index={i}
              canEdit={canEdit}
              onRename={setRenameTeam}
            />
          ))}
        </View>
      )}

      {validatedCards.length > 0 ? (
        <Text style={[styles.hint, { color: colors.inkFaint }]}>
          +{DUO_POINT_RULES.ENDED_SESSION} XP / session · Fer → Or → Diamant → Légendaire
        </Text>
      ) : null}

      <JumeloRenameModal
        visible={Boolean(renameTeam)}
        currentName={renameTeam?.name ?? ''}
        onClose={() => setRenameTeam(null)}
        onSave={onRenameSave}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    overflow: 'hidden',
  },
  bannerText: { flex: 1, gap: 2 },
  bannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bannerTitle: {
    fontFamily: fonts.displaySemi,
    fontSize: 20,
    letterSpacing: -0.3,
    color: '#fff',
  },
  bannerSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.82)',
    marginTop: 2,
  },
  bannerScore: {
    alignItems: 'center',
    minWidth: 64,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.md,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  bannerPts: {
    fontFamily: fonts.displaySemi,
    fontSize: 22,
    color: '#fff',
    letterSpacing: -0.4,
  },
  bannerPtsLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  list: { gap: spacing.sm },
  card: {
    borderWidth: 1.5,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
    overflow: 'hidden',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  partnerBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 0,
  },
  emptyAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerMeta: { flex: 1, minWidth: 0, gap: 2 },
  jumeloName: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
  },
  partnerName: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  statusPill: {
    fontFamily: fonts.body,
    fontSize: 11,
    flex: 1,
  },
  pointsBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 58,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radii.md,
  },
  pointsValue: {
    fontFamily: fonts.displaySemi,
    fontSize: 20,
    color: '#fff',
    letterSpacing: -0.4,
  },
  pointsUnit: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pendingBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  slots: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  renameBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  renameLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  emptySub: {
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
  },
});
