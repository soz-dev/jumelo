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
  onFormed?: (teamId: string) => void;
};

export function DailyTrialBanner({ conversationId, onFormed }: Props) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [trial, setTrial] = useState<DailyTrial | null>(null);
  const [peer, setPeer] = useState<UserProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);

  const reload = useCallback(async () => {
    if (!user?.id || !conversationId) {
      setTrial(null);
      return;
    }
    const t = await getOpenTrialForConversation(user.id, conversationId);
    setTrial(t);
    if (t?.peerId) {
      const p = await resolveUserById(t.peerId);
      setPeer(p ?? null);
    } else {
      setPeer(null);
    }
  }, [user?.id, conversationId]);

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

  const msLeft = Math.max(0, new Date(trial.endsAt).getTime() - Date.now());
  void tick;

  if (trial.outcome === 'formed') {
    return (
      <View
        style={[
          styles.banner,
          {
            backgroundColor: withHexAlpha(colors.primary, 0.12),
            borderColor: withHexAlpha(colors.primary, 0.28),
          },
        ]}
      >
        <Ionicons name="checkmark-circle" size={20} color={colors.primaryDark} />
        <Text style={[styles.title, { color: colors.ink }]}>Jumelo formé</Text>
      </View>
    );
  }

  if (trial.outcome === 'rejected') {
    return (
      <View
        style={[
          styles.banner,
          {
            backgroundColor: withHexAlpha(colors.inkMuted, 0.08),
            borderColor: withHexAlpha(colors.inkMuted, 0.2),
          },
        ]}
      >
        <Ionicons name="time-outline" size={18} color={colors.inkMuted} />
        <Text style={[styles.body, { color: colors.inkMuted }]}>
          Tentative expirée (72 h). Retente via Jumelo du jour.
        </Text>
      </View>
    );
  }

  const iConfirmed = trial.confirmedBy.includes(user.id);
  const peerConfirmed = peer
    ? trial.confirmedBy.includes(peer.id)
    : trial.confirmedBy.some((id) => id !== user.id);
  const peerLabel = peer?.name?.trim().split(/\s+/)[0] || 'ton partenaire';

  const onConfirm = async () => {
    if (busy || iConfirmed || !user) return;
    setBusy(true);
    try {
      const result = await confirmDailyFormation({ me: user, peer });
      if (result.ok) {
        setTrial(result.trial);
        if (result.formed && result.teamId) onFormed?.(result.teamId);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: withHexAlpha(colors.primary, 0.08),
          borderColor: withHexAlpha(colors.primary, 0.22),
        },
      ]}
    >
      <View style={styles.row}>
        <Ionicons name="hourglass-outline" size={18} color={colors.primaryDark} />
        <View style={styles.textCol}>
          <Text style={[styles.title, { color: colors.ink }]}>
            Former le jumelo · {formatRemaining(msLeft)}
          </Text>
          <Text style={[styles.body, { color: colors.inkMuted }]}>
            {iConfirmed
              ? peerConfirmed
                ? 'C’est validé des deux côtés.'
                : `En attente de ${peerLabel}…`
              : `Tu as 72 h pour confirmer avec ${peerLabel}.`}
          </Text>
        </View>
      </View>
      {!iConfirmed ? (
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
      ) : null}
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
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  textCol: {
    flex: 1,
    gap: 2,
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
    alignSelf: 'stretch',
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
