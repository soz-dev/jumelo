import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { safeBack } from '../../src/lib/navigation';
import { Atmosphere } from '../../src/components/Atmosphere';
import { JumeloLottie } from '../../src/components/JumeloLottie';
import { Button } from '../../src/components/ui';
import { fonts, radii, shadows, spacing } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { mockUsers } from '../../src/data/mock';
import { getMatch, scoreLabel, type MatchResult } from '../../src/lib/matching';
import { openChatWithUser, resolveUserById } from '../../src/lib/users';

function avatarUri(name: string, photo?: string) {
  return (
    photo ??
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0F8F8A&color=fff&size=400`
  );
}

export default function MatchSuccessScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [match, setMatch] = useState<MatchResult | null | undefined>(undefined);
  const [openingChat, setOpeningChat] = useState(false);

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

  const mePhoto = useMemo(
    () => (user ? avatarUri(user.name, user.photo) : undefined),
    [user],
  );

  if (!user || !id) return null;

  if (match === undefined) {
    return (
      <Atmosphere>
        <SafeAreaView style={styles.safe}>
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        </SafeAreaView>
      </Atmosphere>
    );
  }

  if (!match) {
    return (
      <Atmosphere>
        <SafeAreaView style={styles.safe}>
          <Pressable onPress={() => safeBack('/(tabs)/discover')} style={styles.closeRow}>
            <Ionicons name="close" size={22} color={colors.ink} />
          </Pressable>
          <Text style={[styles.missing, { color: colors.ink }]}>Profil introuvable</Text>
          <Button
            label="Jumelo du jour"
            onPress={() => safeBack('/(tabs)/discover')}
            style={styles.cta}
          />
        </SafeAreaView>
      </Atmosphere>
    );
  }

  const peerPhoto = avatarUri(match.user.name, match.user.photo);

  return (
    <Atmosphere>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Pressable
          onPress={() => safeBack('/(tabs)/discover')}
          style={[styles.closeRow, { backgroundColor: colors.white, borderColor: colors.border }]}
          accessibilityLabel="Fermer"
        >
          <Ionicons name="close" size={22} color={colors.ink} />
        </Pressable>

        <View style={styles.hero}>
          <View style={styles.confettiWrap} pointerEvents="none">
            <JumeloLottie name="confetti" size={340} loop={false} />
          </View>

          <JumeloLottie name="success" size={96} loop={false} style={styles.successIcon} />

          <Text style={[styles.title, { color: colors.ink }]}>C’est un jumelage !</Text>
          <Text style={[styles.subtitle, { color: colors.inkMuted }]}>
            Toi et {match.user.name} avez formé un jumelo
          </Text>

          <View style={styles.avatarsRow}>
            <View style={[styles.avatarWrap, shadows.soft, { borderColor: colors.primary }]}>
              <Image source={{ uri: mePhoto }} style={styles.avatar} />
            </View>
            <View style={[styles.heartBadge, { backgroundColor: colors.primary }]}>
              <Ionicons name="people" size={22} color="#fff" />
            </View>
            <View style={[styles.avatarWrap, shadows.soft, { borderColor: colors.accent }]}>
              <Image source={{ uri: peerPhoto }} style={styles.avatar} />
            </View>
          </View>

          <LinearGradient
            colors={[colors.primary, colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.scorePill}
          >
            <Text style={styles.scoreValue}>{match.score}%</Text>
            <View>
              <Text style={styles.scoreLabel}>compatibilité</Text>
              <Text style={styles.scoreHint}>{scoreLabel(match.score)}</Text>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.actions}>
          <Button
            label="Discuter"
            icon="chatbubble-outline"
            loading={openingChat}
            onPress={async () => {
              setOpeningChat(true);
              try {
                const path = await openChatWithUser(user.id, match.user.id);
                router.replace(path as `/chat/${string}`);
              } finally {
                setOpeningChat(false);
              }
            }}
          />
          <Button
            label="Voir le profil"
            icon="person-outline"
            variant="secondary"
            onPress={() => router.replace(`/user/${match.user.id}`)}
            style={{ marginTop: spacing.sm }}
          />
          <Button
            label="Jumelo du jour"
            icon="compass-outline"
            variant="ghost"
            onPress={() => safeBack('/(tabs)/discover')}
            style={{ marginTop: spacing.xs }}
          />
        </View>
      </SafeAreaView>
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  closeRow: {
    alignSelf: 'flex-end',
    marginTop: spacing.sm,
    marginRight: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missing: {
    fontFamily: fonts.display,
    fontSize: 24,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  confettiWrap: {
    position: 'absolute',
    top: -20,
    alignSelf: 'center',
    opacity: 0.95,
  },
  successIcon: { marginBottom: spacing.sm },
  title: {
    fontFamily: fonts.display,
    fontSize: 34,
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  avatarWrap: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 3,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  avatar: { width: '100%', height: '100%' },
  heartBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: -10,
    zIndex: 2,
    borderWidth: 3,
    borderColor: '#fff',
  },
  scorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radii.pill,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  scoreValue: {
    color: '#fff',
    fontFamily: fonts.display,
    fontSize: 36,
    letterSpacing: -1,
  },
  scoreLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  scoreHint: {
    color: '#fff',
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  actions: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  cta: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
});
