import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { JumeloRenameModal } from './JumeloRenameModal';
import type { Team, UserProfile } from '../data/mock';
import { useAuth } from '../context/AuthContext';
import { useTeams } from '../context/TeamsContext';
import { useTheme } from '../context/ThemeContext';
import { fonts, radii, spacing, withHexAlpha } from '../design-system';
import { ensureTeamChat } from '../lib/api/teamChats';
import { getTeam, renameJumeloName } from '../lib/api/teams';
import {
  confirmJumeloValidation,
  getJumeloValidation,
  hasUserConfirmed,
  isFormedJumelo,
  isJumeloValidated,
  type JumeloValidationRecord,
} from '../lib/jumeloValidation';
import { isDuoCapacity } from '../lib/teamKind';
import { resolveUsersByIds } from '../lib/users';

type Props = {
  teamId: string;
  /** Met à jour le titre du chat après rename. */
  onTeamNameChange?: (name: string) => void;
};

function firstName(name: string | undefined | null): string {
  if (!name?.trim()) return 'ton partenaire';
  return name.trim().split(/\s+/)[0] ?? name;
}

function partnerIdFor(team: Team, userId: string): string | null {
  const others = team.memberIds.filter((id) => id && id !== userId);
  if (others.length > 0) return others[0];
  if (team.ownerId && team.ownerId !== userId) return team.ownerId;
  return null;
}

export function JumeloValidationBanner({ teamId, onTeamNameChange }: Props) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { refresh } = useTeams();
  const [team, setTeam] = useState<Team | null>(null);
  const [partner, setPartner] = useState<UserProfile | null>(null);
  const [record, setRecord] = useState<JumeloValidationRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    if (!teamId || !user?.id) {
      setTeam(null);
      setReady(true);
      return;
    }
    const t = await getTeam(teamId, user.id);
    if (!t || !isDuoCapacity(t.capacity) || !isFormedJumelo(t)) {
      setTeam(t && isDuoCapacity(t.capacity) ? t : null);
      setPartner(null);
      setRecord(null);
      setReady(true);
      return;
    }
    const [validation, peers] = await Promise.all([
      getJumeloValidation(t.id),
      resolveUsersByIds([partnerIdFor(t, user.id)].filter(Boolean) as string[]),
    ]);
    setTeam(t);
    setRecord(validation);
    setPartner(peers[0] ?? null);
    setReady(true);
  }, [teamId, user?.id]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        await reload();
        if (!active) return;
      })();
      return () => {
        active = false;
      };
    }, [reload]),
  );

  if (!ready || !user || !team || !isDuoCapacity(team.capacity)) {
    return null;
  }

  if (!isFormedJumelo(team)) {
    return (
      <View
        style={[
          styles.banner,
          {
            backgroundColor: withHexAlpha(colors.primary, 0.08),
            borderColor: withHexAlpha(colors.primary, 0.2),
          },
        ]}
      >
        <Ionicons name="people-outline" size={18} color={colors.primaryDark} />
        <Text style={[styles.body, { color: colors.inkMuted }]}>
          En attente d’un partenaire pour former le jumelo.
        </Text>
      </View>
    );
  }

  const validated = isJumeloValidated(record);
  const iConfirmed = hasUserConfirmed(record, user.id);
  const partnerConfirmed = partner
    ? hasUserConfirmed(record, partner.id)
    : (record?.confirmedBy.length ?? 0) >= 1 && !iConfirmed;
  const partnerLabel = firstName(partner?.name);

  const onConfirm = async () => {
    if (busy || iConfirmed) return;
    setBusy(true);
    try {
      const result = await confirmJumeloValidation({ team, userId: user.id });
      if (result.ok) {
        setRecord(result.record);
      }
    } finally {
      setBusy(false);
    }
  };

  const onRename = async (name: string) => {
    const result = await renameJumeloName(team.id, user.id, name);
    if (!result.ok) return result;
    setTeam(result.team);
    onTeamNameChange?.(result.team.name);
    await ensureTeamChat(result.team);
    await refresh();
    return { ok: true as const };
  };

  if (validated) {
    return (
      <>
        <View
          style={[
            styles.banner,
            {
              backgroundColor: withHexAlpha(colors.primary, 0.12),
              borderColor: withHexAlpha(colors.primary, 0.28),
            },
          ]}
        >
          <View style={styles.row}>
            <Ionicons name="checkmark-circle" size={20} color={colors.primaryDark} />
            <View style={styles.textCol}>
              <Text style={[styles.title, { color: colors.ink }]}>Jumelo validé</Text>
              <Text style={[styles.body, { color: colors.inkMuted }]} numberOfLines={1}>
                {team.name}
              </Text>
            </View>
          </View>
          <View style={styles.actions}>
            <Pressable
              onPress={() => setRenameOpen(true)}
              style={[styles.chipBtn, { backgroundColor: colors.white }]}
              accessibilityRole="button"
              accessibilityLabel="Renommer le jumelo"
            >
              <Ionicons name="pencil" size={14} color={colors.primaryDark} />
              <Text style={[styles.chipLabel, { color: colors.primaryDark }]}>
                Renommer
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.push(`/jumelo/${team.id}`)}
              style={[styles.chipBtn, { backgroundColor: colors.primary }]}
              accessibilityRole="button"
              accessibilityLabel="Voir le jumelo"
            >
              <Text style={[styles.chipLabel, { color: '#fff' }]}>Voir</Text>
            </Pressable>
          </View>
        </View>
        <JumeloRenameModal
          visible={renameOpen}
          currentName={team.name}
          onClose={() => setRenameOpen(false)}
          onSave={onRename}
        />
      </>
    );
  }

  if (iConfirmed && !partnerConfirmed) {
    return (
      <View
        style={[
          styles.banner,
          {
            backgroundColor: withHexAlpha('#C9A227', 0.14),
            borderColor: withHexAlpha('#C9A227', 0.35),
          },
        ]}
      >
        <Ionicons name="hourglass-outline" size={18} color="#8A6B10" />
        <Text style={[styles.body, { color: colors.ink, flex: 1 }]}>
          En attente de {partnerLabel}…
        </Text>
      </View>
    );
  }

  // Partenaire a validé (ou personne) → CTA pour moi
  const subtitle = partnerConfirmed
    ? `${partnerLabel} a validé — à toi de confirmer.`
    : 'Vous devez tous les deux valider pour sceller le jumelo.';

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: withHexAlpha(colors.accent, 0.12),
          borderColor: withHexAlpha(colors.accent, 0.35),
        },
      ]}
    >
      <View style={styles.textCol}>
        <Text style={[styles.title, { color: colors.ink }]}>Valider le jumelo</Text>
        <Text style={[styles.body, { color: colors.inkMuted }]}>{subtitle}</Text>
      </View>
      <Pressable
        onPress={onConfirm}
        disabled={busy}
        style={[
          styles.cta,
          { backgroundColor: colors.accent, opacity: busy ? 0.7 : 1 },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Valider le jumelo"
      >
        {busy ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.ctaLabel}>Valider</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: 2,
    borderWidth: 1.5,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 0,
  },
  textCol: { flex: 1, minWidth: 0, gap: 2 },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radii.pill,
  },
  chipLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  cta: {
    minWidth: 88,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: '#fff',
  },
});
