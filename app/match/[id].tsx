import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { safeBack } from '../../src/lib/navigation';

import { Button } from '../../src/components/ui';
import { fonts, radii, spacing } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { mockUsers } from '../../src/data/mock';
import { getMatch, scoreLabel, type MatchResult } from '../../src/lib/matching';
import { openChatWithUser, resolveUserById } from '../../src/lib/users';

export default function MatchRevealScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [match, setMatch] = useState<MatchResult | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    if (!user || !id) {
      setMatch(null);
      return;
    }
    (async () => {
      const local = getMatch(user, mockUsers, id);
      if (local) {
        if (active) setMatch(local);
        return;
      }
      const remote = await resolveUserById(id);
      if (!active) return;
      if (!remote) {
        setMatch(null);
        return;
      }
      setMatch(getMatch(user, [remote], id) ?? null);
    })();
    return () => {
      active = false;
    };
  }, [user, id]);

  if (!user || !id) return null;

  if (match === undefined) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.cream }]}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      </SafeAreaView>
    );
  }

  if (!match) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.cream }]}>
        <Pressable onPress={() => safeBack('/(tabs)/discover')} style={styles.backRow}>
          <Ionicons name="close" size={20} color={colors.primary} />
          <Text style={{ color: colors.primary, fontFamily: fonts.bodyMedium }}>Fermer</Text>
        </Pressable>
        <Text style={[styles.missing, { color: colors.ink }]}>Profil introuvable</Text>
        <Button
          label="Retour"
          onPress={() => safeBack('/(tabs)/discover')}
          style={{ margin: spacing.lg }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.cream }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => safeBack('/(tabs)/discover')} style={styles.backRow}>
          <Ionicons name="close" size={20} color={colors.primary} />
          <Text style={{ color: colors.primary, fontFamily: fonts.bodyMedium }}>Fermer</Text>
        </Pressable>

        <Pressable onPress={() => router.push(`/user/${match.user.id}`)}>
          <ImageBackground
            source={{
              uri:
                match.user.photo ??
                `https://ui-avatars.com/api/?name=${encodeURIComponent(match.user.name)}&size=600`,
            }}
            style={styles.heroPhoto}
            imageStyle={{ borderRadius: radii.lg }}
          >
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              style={styles.heroGradient}
            >
              <Text style={styles.heroName}>{match.user.name}</Text>
              <Text style={styles.heroMeta}>
                {match.user.city} · {scoreLabel(match.score)}
              </Text>
              <Text style={styles.seeProfile}>Voir le profil complet</Text>
            </LinearGradient>
          </ImageBackground>
        </Pressable>

        <View style={[styles.scoreRing, { backgroundColor: colors.primary }]}>
          <Text style={styles.scoreValue}>{match.score}%</Text>
          <Text style={styles.scoreHint}>compatibilité</Text>
        </View>

        <Text style={[styles.section, { color: colors.ink }]}>Pourquoi ce jumelage</Text>
        {match.reasons.map((reason) => {
          const fitPct = Math.round(
            (reason.similarity ?? reason.points / Math.max(reason.max, 1)) * 100,
          );
          return (
            <View key={reason.key} style={[styles.reasonCard, { backgroundColor: colors.white }]}>
              <View style={styles.reasonTop}>
                <Text style={[styles.reasonLabel, { color: colors.ink }]}>{reason.label}</Text>
                <Text style={{ fontFamily: fonts.bodyMedium, color: colors.primary }}>
                  {fitPct}% · +{reason.points} pts
                </Text>
              </View>
              <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${Math.max(8, fitPct)}%`,
                      backgroundColor: colors.accent,
                    },
                  ]}
                />
              </View>
              <Text style={{ marginTop: spacing.sm, fontFamily: fonts.body, color: colors.inkMuted }}>
                {reason.detail}
              </Text>
            </View>
          );
        })}

        <Button
          label="Voir le profil"
          icon="person-outline"
          onPress={() => router.push(`/user/${match.user.id}`)}
          style={{ marginTop: spacing.lg }}
        />
        <Button
          label="Ouvrir le chat"
          icon="chatbubble-outline"
          variant="secondary"
          onPress={async () => {
            const path = await openChatWithUser(user.id, match.user.id);
            router.push(path);
          }}
          style={{ marginTop: spacing.sm }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
  },
  missing: {
    fontFamily: fonts.display,
    fontSize: 24,
    paddingHorizontal: spacing.lg,
  },
  heroPhoto: { height: 220, marginBottom: spacing.md },
  heroGradient: {
    flex: 1,
    borderRadius: radii.lg,
    justifyContent: 'flex-end',
    padding: spacing.md,
  },
  heroName: {
    color: '#fff',
    fontFamily: fonts.display,
    fontSize: 28,
    letterSpacing: -0.6,
  },
  heroMeta: {
    color: 'rgba(255,255,255,0.9)',
    fontFamily: fonts.body,
    marginTop: 2,
  },
  seeProfile: {
    color: '#fff',
    fontFamily: fonts.bodyBold,
    marginTop: 8,
    textDecorationLine: 'underline',
  },
  scoreRing: {
    alignSelf: 'center',
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  scoreValue: { fontFamily: fonts.display, fontSize: 32, color: '#fff' },
  scoreHint: { fontFamily: fonts.body, color: 'rgba(255,255,255,0.8)', marginTop: -4 },
  section: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
    fontFamily: fonts.display,
    fontSize: 22,
    letterSpacing: -0.4,
  },
  reasonCard: {
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  reasonTop: { flexDirection: 'row', justifyContent: 'space-between' },
  reasonLabel: { fontFamily: fonts.bodyBold },
  barTrack: { height: 8, borderRadius: 999, marginTop: spacing.sm, overflow: 'hidden' },
  barFill: { height: '100%' },
});
