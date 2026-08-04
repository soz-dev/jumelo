import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
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

import { safeBack } from '../../src/lib/navigation';
import { CategoryIcon } from '../../src/components/CategoryIcon';
import { Avatar, Button, Subtitle, Title } from '../../src/components/ui';
import { fonts, radii, spacing } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useTeams } from '../../src/context/TeamsContext';
import { useTheme } from '../../src/context/ThemeContext';
import { mockUsers } from '../../src/data/mock';
import { ensureTeamChat } from '../../src/lib/api/teamChats';

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

  useFocusEffect(
    useCallback(() => {
      refresh().catch(() => undefined);
    }, [refresh]),
  );

  const team = teams.find((t) => t.id === id);
  const membership = getMembership(id ?? '');
  const isOwner = membership === 'owner';
  const pending = pendingForTeam(id ?? '');

  const members = (team?.memberIds ?? [])
    .map((memberId) => mockUsers.find((u) => u.id === memberId))
    .filter(Boolean);

  const owner = team ? mockUsers.find((u) => u.id === team.ownerId) : undefined;

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
      Alert.alert('Bienvenue !', 'Tu as rejoint le groupe. Le chat est disponible.');
    } else {
      Alert.alert(
        'Demande envoyée',
        'Le chef a été notifié. Tu seras membre après approbation.',
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
      'Exclure du groupe',
      `Retirer ${memberName} de l’équipe ?`,
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

  const onDissolve = () => {
    if (!id || !team) return;
    Alert.alert(
      'Dissoudre l’équipe',
      `« ${team.name} » sera définitivement supprimée. Continuer ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Dissoudre',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            const result = await dissolve(id);
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
        <Title>Team introuvable</Title>
        <Subtitle>Cette équipe a peut‑être été dissoute.</Subtitle>
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
          <Title style={{ fontSize: 28 }}>{team.name}</Title>
          <Subtitle>
            {team.activity} · {team.nextSession}
          </Subtitle>
          <Text style={[styles.blurb, { color: colors.ink }]}>{team.blurb}</Text>
          <Text style={{ color: colors.inkMuted, fontFamily: fonts.body, marginTop: 8 }}>
            {team.city} · {team.membersCount}/{team.capacity} · {team.vibe}
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

        {membership === 'pending' ? (
          <View style={[styles.banner, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="time-outline" size={20} color={colors.primaryDark} />
            <Text style={{ color: colors.primaryDark, fontFamily: fonts.bodyMedium, flex: 1 }}>
              En attente d’approbation du chef
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
              const requester = mockUsers.find((u) => u.id === req.userId);
              const name = requester?.name ?? 'Membre';
              return (
                <View
                  key={req.id}
                  style={[styles.member, { backgroundColor: colors.white }]}
                >
                  <Avatar
                    name={name}
                    color={requester?.avatarColor ?? colors.primary}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.memberName, { color: colors.ink }]}>{name}</Text>
                    <Text style={{ color: colors.inkMuted, fontFamily: fonts.body }}>
                      Veut rejoindre
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
        {members.map((member) =>
          member ? (
            <View
              key={member.id}
              style={[styles.member, { backgroundColor: colors.white }]}
            >
              <Pressable
                style={styles.memberMain}
                onPress={() => router.push(`/user/${member.id}`)}
              >
                <Avatar name={member.name} color={member.avatarColor} />
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.memberName, { color: colors.ink }]}>{member.name}</Text>
                    {member.id === team.ownerId ? (
                      <View style={[styles.badge, { backgroundColor: colors.primarySoft }]}>
                        <Text
                          style={{
                            color: colors.primaryDark,
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
                    {member.city} · {member.vibes.join(' · ')}
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
          ) : null,
        )}

        {membership === 'none' || membership === 'rejected' ? (
          <Button
            label={
              team.locked ? 'Demander à intégrer le groupe' : 'Rejoindre le groupe'
            }
            onPress={onRequestJoin}
            loading={busy}
            style={{ marginTop: spacing.xl }}
            icon={team.locked ? 'hand-left-outline' : 'enter-outline'}
          />
        ) : null}

        {membership === 'member' || membership === 'owner' ? (
          <Button
            label="Ouvrir le chat du groupe"
            onPress={onOpenGroupChat}
            loading={busy}
            style={{ marginTop: spacing.xl }}
            icon="chatbubbles-outline"
          />
        ) : null}

        {isOwner ? (
          <Button
            label="Dissoudre l’équipe"
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
