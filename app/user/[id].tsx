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

import { Atmosphere } from '../../src/components/Atmosphere';
import { CategoryIcon } from '../../src/components/CategoryIcon';
import { CommonPointsBlock } from '../../src/components/CommonPointsBlock';
import { Button, Chip, ScoreBadge } from '../../src/components/ui';
import { availabilities, getCategory, levels } from '../../src/constants/catalog';
import { fonts, radii, shadows, spacing } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import type { UserProfile } from '../../src/data/mock';
import { getCommonPoints } from '../../src/lib/commonPoints';
import { computeMatch, scoreLabel } from '../../src/lib/matching';
import { useRequirePremium } from '../../src/lib/premiumStore';
import { chatPathForUser, openChatWithUser, resolveUserById } from '../../src/lib/users';

export default function PublicProfileScreen() {
  const { colors } = useTheme();
  const { user: me } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isSelfParam = Boolean(me && id && me.id === id);
  const { ready: premiumReady, allowed } = useRequirePremium(!isSelfParam);
  const [profile, setProfile] = useState<UserProfile | undefined>(undefined);
  const [loadingProfile, setLoadingProfile] = useState(Boolean(id));

  useEffect(() => {
    let active = true;
    if (!id) {
      setProfile(undefined);
      setLoadingProfile(false);
      return;
    }
    if (!isSelfParam && (!premiumReady || !allowed)) {
      return;
    }
    setLoadingProfile(true);
    (async () => {
      const resolved = await resolveUserById(id);
      if (active) {
        setProfile(resolved);
        setLoadingProfile(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id, isSelfParam, premiumReady, allowed]);

  const match = me && profile ? computeMatch(me, profile) : undefined;
  const commonPoints = me && profile ? getCommonPoints(me, profile) : [];
  const isSelf = Boolean(me && profile && me.id === profile.id);
  const levelLabel = levels.find((l) => l.id === profile?.level)?.label ?? profile?.level;
  const dispos = (profile?.availability ?? [])
    .map((a) => availabilities.find((x) => x.id === a)?.label ?? a)
    .join(' · ');

  if ((!isSelfParam && (!premiumReady || !allowed)) || loadingProfile) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.cream }]}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.cream }]}>
        <Pressable onPress={() => safeBack('/(tabs)/discover')} style={styles.backRow}>
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
          <Text style={{ color: colors.primary, fontFamily: fonts.bodyMedium }}>Retour</Text>
        </Pressable>
        <Text style={[styles.missing, { color: colors.ink }]}>Profil introuvable</Text>
      </SafeAreaView>
    );
  }

  return (
    <Atmosphere>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <Pressable
              onPress={() => safeBack('/(tabs)/discover')}
              style={[styles.iconBtn, { backgroundColor: colors.white, borderColor: colors.border }]}
            >
              <Ionicons name="arrow-back" size={20} color={colors.ink} />
            </Pressable>
            <Text style={[styles.topTitle, { color: colors.ink }]}>Profil</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={[styles.heroCard, shadows.soft, { backgroundColor: colors.white }]}>
            <ImageBackground
              source={{
                uri:
                  profile.photo ??
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&size=800&background=0F8F8A&color=fff`,
              }}
              style={styles.heroPhoto}
              imageStyle={{ borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg }}
            >
              <LinearGradient
                colors={['transparent', 'rgba(10,20,28,0.85)']}
                style={styles.heroGradient}
              >
                {profile.universes[0] ? (
                  <View style={styles.heroPill}>
                    <CategoryIcon universeId={profile.universes[0]} size={28} />
                    <Text style={styles.heroPillText}>
                      {getCategory(profile.universes[0])?.shortLabel}
                    </Text>
                  </View>
                ) : null}
                {match ? (
                  <View style={styles.heroScore}>
                    <ScoreBadge score={match.score} />
                  </View>
                ) : null}
                <Text style={styles.heroName}>
                  {profile.name}
                  {profile.age ? ` · ${profile.age}` : ''}
                </Text>
                <View style={styles.heroMeta}>
                  <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.heroMetaText}>{profile.city}</Text>
                  {profile.online ? (
                    <>
                      <Text style={styles.heroMetaText}>·</Text>
                      <View style={styles.onlineDot} />
                      <Text style={styles.heroMetaText}>En ligne</Text>
                    </>
                  ) : null}
                </View>
              </LinearGradient>
            </ImageBackground>

            <View style={styles.heroBody}>
              <Text style={[styles.bio, { color: colors.ink }]}>{profile.bio}</Text>
              {match && !isSelf ? (
                <Text style={[styles.matchLabel, { color: colors.primary }]}>
                  {scoreLabel(match.score)} · {match.score}/100
                </Text>
              ) : null}
            </View>
          </View>

          {!isSelf ? (
            <CommonPointsBlock points={commonPoints} score={match?.score} />
          ) : null}

          <Text style={[styles.section, { color: colors.ink }]}>Univers</Text>
          <View style={styles.wrap}>
            {profile.universes.map((universeId) => {
              const cat = getCategory(universeId);
              return (
                <Chip
                  key={universeId}
                  name={universeId}
                  label={cat?.shortLabel ?? universeId}
                  selected
                />
              );
            })}
          </View>

          <Text style={[styles.section, { color: colors.ink }]}>Intérêts</Text>
          <View style={styles.wrap}>
            {profile.interests.map((interest) => (
              <Chip key={interest} label={interest} selected />
            ))}
          </View>

          <Text style={[styles.section, { color: colors.ink }]}>Vibe & niveau</Text>
          <View style={[styles.infoCard, { backgroundColor: colors.white, borderColor: colors.border }]}>
            <View style={styles.infoRow}>
              <Ionicons name="happy-outline" size={18} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.ink }]}>
                Vibe {profile.vibes.join(' · ')}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="trophy-outline" size={18} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.ink }]}>Niveau {levelLabel}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={18} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.ink }]}>
                {dispos || 'Dispos non renseignées'}
              </Text>
            </View>
          </View>

          <Text style={[styles.section, { color: colors.ink }]}>Objectifs</Text>
          <View style={styles.wrap}>
            {profile.objectives.map((objective) => (
              <Chip key={objective} label={objective} />
            ))}
          </View>

          <Text style={[styles.section, { color: colors.ink }]}>Fiabilité</Text>
          <View style={[styles.reliability, { backgroundColor: colors.white, borderColor: colors.border }]}>
            <Ionicons name="ribbon-outline" size={26} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.bodyBold, color: colors.ink }}>
                Score de fiabilité
              </Text>
              <Text style={{ fontFamily: fonts.body, color: colors.inkMuted, fontSize: 13 }}>
                Basé sur sessions & feedbacks
              </Text>
            </View>
            <Text style={{ fontFamily: fonts.display, fontSize: 28, color: colors.primary }}>
              {profile.reliability}
            </Text>
          </View>

          {(profile.languages?.length ?? 0) > 0 ? (
            <>
              <Text style={[styles.section, { color: colors.ink }]}>Langues</Text>
              <View style={styles.wrap}>
                {profile.languages!.map((lang) => (
                  <Chip key={lang} name="language" label={lang} selected />
                ))}
              </View>
            </>
          ) : null}

          {match && match.reasons.length > 0 ? (
            <>
              <Text style={[styles.section, { color: colors.ink }]}>Pourquoi on match</Text>
              {match.reasons.slice(0, 3).map((reason) => (
                <View
                  key={reason.key}
                  style={[styles.reasonCard, { backgroundColor: colors.white, borderColor: colors.border }]}
                >
                  <View style={styles.reasonTop}>
                    <Text style={{ fontFamily: fonts.bodyBold, color: colors.ink }}>
                      {reason.label}
                    </Text>
                    <Text style={{ fontFamily: fonts.bodyMedium, color: colors.primary }}>
                      {reason.points}/{reason.max}
                    </Text>
                  </View>
                  <Text style={{ marginTop: 4, fontFamily: fonts.body, color: colors.inkMuted }}>
                    {reason.detail}
                  </Text>
                </View>
              ))}
              <Button
                label="Voir le détail du jumelage"
                variant="secondary"
                onPress={() => router.push(`/match/${profile.id}`)}
                style={{ marginTop: spacing.sm }}
              />
            </>
          ) : null}

          {!isSelf ? (
            <View style={styles.ctaBlock}>
              <Button
                label="Discuter"
                icon="chatbubble-outline"
                onPress={async () => {
                  const path = me
                    ? await openChatWithUser(me.id, profile.id)
                    : chatPathForUser(profile.id);
                  router.push(path);
                }}
              />
              <Button
                label="Inviter à jouer"
                icon="game-controller-outline"
                variant="accent"
                onPress={() =>
                  router.push({
                    pathname: '/invite/[userId]',
                    params: {
                      userId: profile.id,
                      activity: profile.interests[0] ?? 'session',
                    },
                  })
                }
                style={{ marginTop: spacing.sm }}
              />
            </View>
          ) : (
            <Text style={[styles.selfHint, { color: colors.inkMuted }]}>
              C’est ton profil public.
            </Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: spacing.lg,
  },
  missing: {
    fontFamily: fonts.display,
    fontSize: 24,
    paddingHorizontal: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    letterSpacing: -0.4,
  },
  heroCard: {
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  heroPhoto: { height: 320 },
  heroGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.md,
  },
  heroPill: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: radii.pill,
    paddingRight: 12,
  },
  heroPillText: {
    color: '#fff',
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  heroScore: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
  },
  heroName: {
    color: '#fff',
    fontFamily: fonts.display,
    fontSize: 30,
    letterSpacing: -0.8,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  heroMetaText: {
    color: 'rgba(255,255,255,0.9)',
    fontFamily: fonts.body,
    fontSize: 14,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  heroBody: { padding: spacing.md, gap: spacing.sm },
  bio: { fontFamily: fonts.body, lineHeight: 22, fontSize: 15 },
  matchLabel: { fontFamily: fonts.bodyBold },
  section: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    fontFamily: fonts.display,
    fontSize: 22,
    letterSpacing: -0.4,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  infoCard: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { fontFamily: fonts.bodyMedium, fontSize: 15 },
  reliability: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  reasonCard: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  reasonTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ctaBlock: { marginTop: spacing.xl },
  selfHint: {
    marginTop: spacing.xl,
    textAlign: 'center',
    fontFamily: fonts.body,
  },
});
