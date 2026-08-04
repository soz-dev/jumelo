import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Atmosphere } from '../../src/components/Atmosphere';
import { CommonPointsBlock } from '../../src/components/CommonPointsBlock';
import { Button } from '../../src/components/ui';
import { fonts, radii, spacing } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import type { UserProfile } from '../../src/data/mock';
import { createLike, dismissIncomingLike, markIncomingLikeRead } from '../../src/lib/api/likes';
import { getCommonPoints } from '../../src/lib/commonPoints';
import { computeMatch } from '../../src/lib/matching';
import { safeBack } from '../../src/lib/navigation';
import { resolveUserById } from '../../src/lib/users';

export default function LikedMeScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: me } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    if (!id || !me) {
      setProfile(null);
      return;
    }
    (async () => {
      await markIncomingLikeRead(me.id, id);
      const resolved = await resolveUserById(id);
      if (active) setProfile(resolved ?? null);
    })();
    return () => {
      active = false;
    };
  }, [id, me]);

  if (!me || !id) return null;

  if (profile === undefined) {
    return (
      <Atmosphere>
        <SafeAreaView style={styles.safe}>
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        </SafeAreaView>
      </Atmosphere>
    );
  }

  if (!profile) {
    return (
      <Atmosphere>
        <SafeAreaView style={styles.safe}>
          <Pressable onPress={() => safeBack('/(tabs)/home')} style={styles.close}>
            <Ionicons name="close" size={22} color={colors.ink} />
          </Pressable>
          <Text style={[styles.missing, { color: colors.ink }]}>Profil introuvable</Text>
        </SafeAreaView>
      </Atmosphere>
    );
  }

  const match = computeMatch(me, profile);
  const score = match.score;
  const commonPoints = getCommonPoints(me, profile);

  const onLikeBack = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await createLike(me.id, profile.id, score);
      if (result.mutual || result.alreadyMatched) {
        router.replace(`/match-success/${profile.id}`);
        return;
      }
      // Pas mutuel (cas rare si seed absent) — toast via retour Home
      safeBack('/(tabs)/home');
    } finally {
      setBusy(false);
    }
  };

  const onPass = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await dismissIncomingLike(me.id, profile.id);
      safeBack('/(tabs)/home');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Atmosphere>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Pressable
          onPress={() => safeBack('/(tabs)/home')}
          style={[styles.close, { backgroundColor: colors.white, borderColor: colors.border }]}
          accessibilityLabel="Fermer"
        >
          <Ionicons name="close" size={22} color={colors.ink} />
        </Pressable>

        <View style={styles.hero}>
          <View style={[styles.photoWrap, { borderColor: colors.primary }]}>
            <ImageBackground
              source={{
                uri:
                  profile.photo ??
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&size=800&background=0F8F8A&color=fff`,
              }}
              style={styles.photo}
              imageStyle={{ borderRadius: radii.lg }}
            >
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.75)']}
                style={styles.photoGradient}
              >
                <Text style={styles.photoName}>
                  {profile.name}
                  {profile.age ? ` · ${profile.age}` : ''}
                </Text>
                <Text style={styles.photoCity}>{profile.city}</Text>
              </LinearGradient>
            </ImageBackground>
          </View>

          <View style={[styles.banner, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="people" size={22} color={colors.primary} />
            <Text style={[styles.bannerText, { color: colors.primaryDark }]}>
              {profile.name} veut jumeler avec toi
            </Text>
          </View>

          <Text style={[styles.subcopy, { color: colors.inkMuted }]}>
            Points communs et raisons visibles — pas de romance, juste un coéquipier.
          </Text>

          <Text style={[styles.bio, { color: colors.inkMuted }]} numberOfLines={3}>
            {profile.bio}
          </Text>

          <CommonPointsBlock points={commonPoints} score={score} compact />
        </View>

        <View style={styles.actions}>
          <Button
            label="Jumeler aussi"
            icon="people"
            loading={busy}
            onPress={onLikeBack}
          />
          <Button
            label="Pas pour moi"
            icon="close"
            variant="secondary"
            disabled={busy}
            onPress={onPass}
            style={{ marginTop: spacing.sm }}
          />
          <Button
            label="Voir le profil"
            icon="person-outline"
            variant="ghost"
            disabled={busy}
            onPress={() => router.push(`/user/${profile.id}`)}
            style={{ marginTop: spacing.xs }}
          />
        </View>
      </SafeAreaView>
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  close: {
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
    fontSize: 22,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  hero: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoWrap: {
    width: '100%',
    maxWidth: 340,
    aspectRatio: 0.85,
    borderRadius: radii.lg + 4,
    borderWidth: 3,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  photo: { flex: 1 },
  photoGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.md,
  },
  photoName: {
    color: '#fff',
    fontFamily: fonts.display,
    fontSize: 28,
    letterSpacing: -0.5,
  },
  photoCity: {
    color: 'rgba(255,255,255,0.88)',
    fontFamily: fonts.body,
    marginTop: 2,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radii.pill,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginBottom: spacing.md,
  },
  bannerText: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
  },
  subcopy: {
    fontFamily: fonts.body,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  bio: {
    fontFamily: fonts.body,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.sm,
  },
  scoreHint: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    marginTop: spacing.sm,
  },
  actions: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
});
