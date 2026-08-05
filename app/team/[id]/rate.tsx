import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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

import { Avatar, Button } from '../../../src/components/ui';
import { fonts, radii, spacing, withHexAlpha } from '../../../src/constants/theme';
import { useAuth } from '../../../src/context/AuthContext';
import { useTheme } from '../../../src/context/ThemeContext';
import { safeBack } from '../../../src/lib/navigation';
import {
  getSessionById,
  hasRatedSession,
  RATING_TAGS,
  submitSessionRatings,
  type RatingEntryInput,
  type RatingTagId,
} from '../../../src/lib/teamSessions';
import { resolveUserById } from '../../../src/lib/users';

type MemberDraft = {
  id: string;
  name: string;
  avatarColor: string;
  stars: number;
  tag?: RatingTagId;
};

export default function RateTeammatesScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { id, sessionId } = useLocalSearchParams<{ id: string; sessionId: string }>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [members, setMembers] = useState<MemberDraft[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!user || !sessionId) {
        setError('Session invalide.');
        setLoading(false);
        return;
      }
      const session = await getSessionById(sessionId);
      if (!session || session.status !== 'ended') {
        if (active) {
          setError('Cette session n’est plus ouverte à la notation.');
          setLoading(false);
        }
        return;
      }
      if (!session.participantIds.includes(user.id)) {
        if (active) {
          setError('Tu ne faisais pas partie de cette session.');
          setLoading(false);
        }
        return;
      }
      const already = await hasRatedSession(sessionId, user.id);
      if (already) {
        if (active) {
          setError('Tu as déjà noté les coéquipiers de cette session.');
          setLoading(false);
        }
        return;
      }

      const others = session.participantIds.filter((pid) => pid !== user.id);
      const drafts: MemberDraft[] = [];
      for (const pid of others) {
        const resolved = await resolveUserById(pid);
        drafts.push({
          id: pid,
          name: resolved?.name ?? 'Coéquipier',
          avatarColor: resolved?.avatarColor ?? colors.primary,
          stars: 0,
        });
      }
      if (active) {
        setMembers(drafts);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user, sessionId, colors.primary]);

  const allRated = useMemo(
    () => members.length > 0 && members.every((m) => m.stars >= 1),
    [members],
  );

  const setStars = (memberId: string, stars: number) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, stars } : m)),
    );
  };

  const setTag = (memberId: string, tag: RatingTagId) => {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === memberId ? { ...m, tag: m.tag === tag ? undefined : tag } : m,
      ),
    );
  };

  const onSubmit = async () => {
    if (!user || !sessionId || !allRated) return;
    setBusy(true);
    const entries: RatingEntryInput[] = members.map((m) => ({
      rateeId: m.id,
      stars: m.stars,
      tag: m.tag,
    }));
    const result = await submitSessionRatings({
      sessionId,
      raterId: user.id,
      entries,
    });
    setBusy(false);
    if (!result.ok) {
      Alert.alert('Impossible', result.error);
      return;
    }
    Alert.alert(
      'Merci !',
      'Tes notes sont enregistrées de façon anonyme. Seule la moyenne apparaît sur les profils.',
      [{ text: 'OK', onPress: () => router.replace(`/team/${id}`) }],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.cream }]}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.cream }]}>
        <Pressable onPress={() => safeBack(id ? `/team/${id}` : '/(tabs)/teams')} style={styles.back}>
          <Text style={{ color: colors.primary, fontFamily: fonts.bodyMedium }}>← Retour</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.ink }]}>Notation</Text>
        <Text style={{ color: colors.inkMuted, fontFamily: fonts.body, marginTop: spacing.md }}>
          {error}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.cream }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => safeBack(id ? `/team/${id}` : '/(tabs)/teams')} style={styles.back}>
          <Text style={{ color: colors.primary, fontFamily: fonts.bodyMedium }}>← Retour</Text>
        </Pressable>

        <Text style={[styles.title, { color: colors.ink }]}>Noter les coéquipiers</Text>
        <Text style={[styles.intro, { color: colors.inkMuted }]}>
          Session terminée — note chaque membre (1–5). Les notes sont anonymes : personne ne
          verra qui a noté qui, seulement la moyenne sur le profil.
        </Text>

        {members.map((member) => (
          <View
            key={member.id}
            style={[styles.card, { backgroundColor: colors.white, borderColor: colors.border }]}
          >
            <View style={styles.memberHead}>
              <Avatar name={member.name} color={member.avatarColor} />
              <Text style={[styles.memberName, { color: colors.ink }]}>{member.name}</Text>
            </View>

            <View style={styles.starsPick}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable
                  key={n}
                  onPress={() => setStars(member.id, n)}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={`${n} étoile${n > 1 ? 's' : ''}`}
                >
                  <Ionicons
                    name={n <= member.stars ? 'star' : 'star-outline'}
                    size={32}
                    color={n <= member.stars ? colors.warning : colors.border}
                  />
                </Pressable>
              ))}
            </View>

            <Text style={[styles.tagHint, { color: colors.inkMuted }]}>
              Tag positif (optionnel)
            </Text>
            <View style={styles.tags}>
              {RATING_TAGS.map((tag) => {
                const selected = member.tag === tag.id;
                return (
                  <Pressable
                    key={tag.id}
                    onPress={() => setTag(member.id, tag.id)}
                    style={[
                      styles.tag,
                      {
                        backgroundColor: selected
                          ? withHexAlpha(colors.primary, 0.12)
                          : colors.white,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontFamily: selected ? fonts.bodyBold : fonts.bodyMedium,
                        fontSize: 12,
                        color: selected ? colors.primary : colors.inkMuted,
                      }}
                    >
                      {tag.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}

        <Button
          label="Valider mes notes"
          onPress={onSubmit}
          loading={busy}
          disabled={!allRated}
          style={{ marginTop: spacing.md }}
          icon="checkmark-circle-outline"
        />
        {!allRated ? (
          <Text style={[styles.hint, { color: colors.inkMuted }]}>
            Attribue une note à chaque coéquipier pour valider.
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  back: { marginBottom: spacing.sm },
  title: { fontFamily: fonts.displaySemi, fontSize: 26 },
  intro: {
    fontFamily: fonts.body,
    lineHeight: 22,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  card: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  memberHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  memberName: { fontFamily: fonts.bodyBold, fontSize: 16 },
  starsPick: { flexDirection: 'row', gap: 8, marginTop: 4 },
  tagHint: { fontFamily: fonts.body, fontSize: 12, marginTop: 4 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    borderRadius: radii.pill,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
