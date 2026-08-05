import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { UserProfile } from '../data/mock';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { fonts, radii, spacing, withHexAlpha } from '../design-system';
import {
  confirmDailyFormation,
  formatRemaining,
  getOpenTrialForConversation,
  type DailyTrial,
} from '../lib/dailyJumelo';
import { resolveUserById } from '../lib/users';

type Props = {
  conversationId: string;
  /** Compact sticky strip above the composer. */
  sticky?: boolean;
  onFormed?: (teamId: string) => void;
  /** Called when trial conversation id was healed (seed → dm-*). */
  onConversationHealed?: (conversationId: string) => void;
};

export function DailyTrialBanner({
  conversationId,
  sticky = false,
  onFormed,
  onConversationHealed,
}: Props) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [trial, setTrial] = useState<DailyTrial | null>(null);
  const [peer, setPeer] = useState<UserProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const [justFormed, setJustFormed] = useState(false);

  const reload = useCallback(async () => {
    if (!user?.id || !conversationId) {
      setTrial(null);
      return;
    }
    const t = await getOpenTrialForConversation(user.id, conversationId);
    setTrial(t);
    if (t?.conversationId && t.conversationId !== conversationId) {
      onConversationHealed?.(t.conversationId);
    }
    if (t?.peerId) {
      const p = await resolveUserById(t.peerId);
      setPeer(p ?? null);
    } else {
      setPeer(null);
    }
  }, [user?.id, conversationId, onConversationHealed]);

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

  useEffect(() => {
    if (!trial || trial.outcome !== 'open') return;
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, [trial?.outcome, trial?.endsAt]);

  if (!trial || !user) return null;
  if (trial.outcome === 'rejected') {
    return (
      <View
        style={[
          sticky ? styles.sticky : styles.banner,
          {
            backgroundColor: withHexAlpha(colors.inkMuted, 0.08),
            borderColor: withHexAlpha(colors.inkMuted, 0.2),
          },
        ]}
      >
        <Ionicons name="time-outline" size={18} color={colors.inkMuted} />
        <Text style={[styles.body, { color: colors.inkMuted, flex: 1 }]}>
          Tentative expirée (72 h). Retente via Jumelo du jour.
        </Text>
      </View>
    );
  }

  const msLeft = Math.max(0, new Date(trial.endsAt).getTime() - Date.now());
  void tick;

  const iConfirmed = trial.confirmedBy.includes(user.id);
  const peerConfirmed = peer
    ? trial.confirmedBy.includes(peer.id)
    : trial.confirmedBy.some((id) => id !== user.id);

  if (trial.outcome === 'formed' || justFormed) {
    return (
      <View
        style={[
          sticky ? styles.sticky : styles.banner,
          {
            backgroundColor: withHexAlpha(colors.primary, 0.12),
            borderColor: withHexAlpha(colors.primary, 0.28),
          },
        ]}
      >
        <Ionicons name="checkmark-circle" size={20} color={colors.primaryDark} />
        <Text style={[styles.title, { color: colors.ink, flex: 1 }]}>
          Jumelo formé — redirection…
        </Text>
      </View>
    );
  }

  const onConfirm = async () => {
    if (busy || iConfirmed || !user) return;
    setBusy(true);
    try {
      const result = await confirmDailyFormation({ me: user, peer });
      if (!result.ok) return;
      setTrial(result.trial);
      if (result.formed && result.teamId) {
        setJustFormed(true);
        onFormed?.(result.teamId);
      }
    } finally {
      setBusy(false);
    }
  };

  // En attente de l’autre après ma confirmation
  if (iConfirmed && !peerConfirmed) {
    return (
      <View
        style={[
          sticky ? styles.sticky : styles.banner,
          {
            backgroundColor: withHexAlpha(colors.primary, 0.08),
            borderColor: withHexAlpha(colors.primary, 0.22),
          },
        ]}
      >
        <Ionicons name="hourglass-outline" size={18} color={colors.primaryDark} />
        <Text style={[styles.body, { color: colors.ink, flex: 1 }]}>
          En attente de la validation de ton duo
        </Text>
      </View>
    );
  }

  // Les deux ont confirmé — création du duo en cours
  if (iConfirmed && peerConfirmed) {
    return (
      <View
        style={[
          sticky ? styles.sticky : styles.banner,
          {
            backgroundColor: withHexAlpha(colors.primary, 0.12),
            borderColor: withHexAlpha(colors.primary, 0.28),
          },
        ]}
      >
        <ActivityIndicator color={colors.primary} />
        <Text style={[styles.body, { color: colors.ink, flex: 1 }]}>
          Formation du jumelo…
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        sticky ? styles.sticky : styles.banner,
        {
          backgroundColor: withHexAlpha(colors.primary, 0.08),
          borderColor: withHexAlpha(colors.primary, 0.22),
        },
      ]}
    >
      {!sticky ? (
        <View style={styles.row}>
          <Ionicons name="people-outline" size={18} color={colors.primaryDark} />
          <Text style={[styles.body, { color: colors.inkMuted, flex: 1 }]}>
            {formatRemaining(msLeft)} pour former le duo
          </Text>
        </View>
      ) : null}
      <Pressable
        onPress={onConfirm}
        disabled={busy || msLeft <= 0}
        style={[
          styles.cta,
          {
            backgroundColor: colors.primary,
            opacity: busy || msLeft <= 0 ? 0.6 : 1,
          },
        ]}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.ctaLabel}>Former le jumelo</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  sticky: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  cta: {
    flex: 1,
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ctaLabel: {
    color: '#fff',
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
});
