import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { safeBack } from '../../src/lib/navigation';

import { AchievementsSection } from '../../src/components/AchievementsSection';
import { Atmosphere } from '../../src/components/Atmosphere';
import { CategoryIcon } from '../../src/components/CategoryIcon';
import { CommonPointsBlock } from '../../src/components/CommonPointsBlock';
import { InterestTile } from '../../src/components/InterestTile';
import { ProfileDuosSection } from '../../src/components/ProfileDuosSection';
import { ProfileStatsCard } from '../../src/components/ProfileStatsCard';
import { TeammateRatingsCard } from '../../src/components/TeammateRatingsCard';
import { Button, Chip, ScoreBadge } from '../../src/components/ui';
import { availabilities, getCategory, getDominantUniverse, levels, vibes } from '../../src/constants/catalog';
import { fonts, radii, shadows, spacing } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { Avatar, ListRow, SectionHeader, withHexAlpha } from '../../src/design-system';
import { getPersona } from '../../src/lib/profilePersonas';
import type { UserProfile } from '../../src/data/mock';
import { mockUsers } from '../../src/data/mock';
import { acceptDailyJumelo, refuseDailyJumelo, type DailyDecision } from '../../src/lib/dailyJumelo';
import { getCommonPoints } from '../../src/lib/commonPoints';
import {
  computeMatch,
  isOfficialJumelage,
  MATCH_THRESHOLD,
  scoreLabel,
} from '../../src/lib/matching';
import { useRequirePremium } from '../../src/lib/premiumStore';
import {
  REPORT_REASONS,
  reportUser,
  type ReportReasonId,
} from '../../src/lib/userReports';
import { chatPathForUser, openChatWithUser, resolveUserById } from '../../src/lib/users';

export default function PublicProfileScreen() {
  const { colors } = useTheme();
  const { user: me } = useAuth();
  const { id, fromDaily, dailyState } = useLocalSearchParams<{ id: string; fromDaily?: string; dailyState?: string }>();
  const isFromDaily = fromDaily === '1';

  // Résoudre la décision initiale depuis le param passé par home (fiable, pas d'AsyncStorage)
  const initialDecision: DailyDecision | null | undefined = isFromDaily
    ? dailyState === 'accepted' ? 'accepted' : dailyState === 'refused' ? 'refused' : null
    : null;

  const isSelfParam = Boolean(me && id && me.id === id);
  const { ready: premiumReady, allowed } = useRequirePremium(!isSelfParam);
  const [profile, setProfile] = useState<UserProfile | undefined>(undefined);
  const [loadingProfile, setLoadingProfile] = useState(Boolean(id));
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReasonId>('harassment');
  const [reportDetails, setReportDetails] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const [dailyBusy, setDailyBusy] = useState(false);
  const [dailyDecision, setDailyDecision] = useState<DailyDecision | null>(initialDecision ?? null);

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

  const dominantUniverse = profile ? getDominantUniverse(profile.universes, profile.subCategoryIds) : null;
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
            {profile.photo ? (
              <ImageBackground
                source={{ uri: profile.photo }}
                style={styles.heroPhoto}
                imageStyle={{ borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg }}
              >
                <LinearGradient
                  colors={['transparent', 'rgba(10,20,28,0.85)']}
                  style={styles.heroGradient}
                >
                  {dominantUniverse ? (
                    <View style={styles.heroPill}>
                      <CategoryIcon universeId={dominantUniverse} size={28} />
                      <Text style={styles.heroPillText}>
                        {getCategory(dominantUniverse)?.shortLabel}
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
            ) : (
              <LinearGradient
                colors={[
                  getPersona(profile.avatarPersonaId)?.color ?? profile.avatarColor ?? colors.primary,
                  colors.primaryDark,
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.heroPhoto, styles.heroPersona]}
              >
                {dominantUniverse ? (
                  <View style={styles.heroPill}>
                    <CategoryIcon universeId={dominantUniverse} size={28} />
                    <Text style={styles.heroPillText}>
                      {getCategory(dominantUniverse)?.shortLabel}
                    </Text>
                  </View>
                ) : null}
                {match ? (
                  <View style={styles.heroScore}>
                    <ScoreBadge score={match.score} />
                  </View>
                ) : null}
                <Avatar
                  name={profile.name}
                  personaId={profile.avatarPersonaId}
                  color={profile.avatarColor}
                  size={112}
                  online={profile.online}
                />
                <Text style={[styles.heroName, { marginTop: spacing.md }]}>
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
            )}

            <View style={styles.heroBody}>
              <Text style={[styles.bio, { color: colors.ink }]}>{profile.bio}</Text>
              {match && !isSelf ? (
                <Text
                  style={[
                    styles.matchLabel,
                    {
                      color: isOfficialJumelage(match.score)
                        ? colors.primary
                        : colors.inkMuted,
                    },
                  ]}
                >
                  {scoreLabel(match.score)} · {match.score}%
                  {!isOfficialJumelage(match.score)
                    ? ` · seuil ${MATCH_THRESHOLD}%`
                    : ''}
                </Text>
              ) : null}
            </View>
          </View>

          <ProfileStatsCard userId={profile.id} />

          <ProfileDuosSection
            userId={profile.id}
            title={isSelf ? 'Tes jumelos' : 'Jumelos'}
            possessive={isSelf}
          />

          {!isSelf && match ? (
            <>
              <CommonPointsBlock
                points={commonPoints}
                score={match.score}
                reasons={match.reasons}
              />
              {!isFromDaily ? (
                <Button
                  label="Voir le détail du jumelage"
                  variant="ghost"
                  onPress={() => router.push(`/match/${profile.id}`)}
                  style={{ marginTop: spacing.xs }}
                />
              ) : null}
            </>
          ) : null}

          <SectionHeader title="Univers" />
          <View style={styles.wrap}>
            {profile.universes.length === 0 ? (
              <Text style={{ fontFamily: fonts.body, color: colors.inkMuted }}>
                Aucun univers renseigné
              </Text>
            ) : (
              profile.universes.map((universeId) => {
                const cat = getCategory(universeId);
                return (
                  <Chip
                    key={universeId}
                    name={universeId}
                    label={cat?.shortLabel ?? universeId}
                    tone="outline"
                  />
                );
              })
            )}
          </View>

          <SectionHeader title="Intérêts" />
          {profile.interests.length === 0 ? (
            <Text style={{ fontFamily: fonts.body, color: colors.inkMuted }}>
              Aucun intérêt renseigné
            </Text>
          ) : (
            profile.interests.map((interest) => (
              <InterestTile
                key={interest}
                interest={interest}
                levelLabel={levelLabel}
              />
            ))
          )}

          <SectionHeader title="Profil" subtitle="Vibe, niveau et créneaux" />
          <ListRow
            title={`Vibe ${profile.vibes
              .map((vibeId) => vibes.find((v) => v.id === vibeId)?.label ?? vibeId)
              .join(' · ')}`}
            subtitle={`Niveau ${levelLabel}`}
            chevron={false}
            left={<Ionicons name="happy-outline" size={20} color={colors.primary} />}
          />
          <ListRow
            title={dispos || 'Dispos non renseignées'}
            subtitle={profile.objectives.join(' · ') || 'Objectifs non renseignés'}
            chevron={false}
            left={<Ionicons name="time-outline" size={20} color={colors.primary} />}
          />
          <ListRow
            title={`Fiabilité ${profile.reliability}%`}
            subtitle={
              (profile.languages?.length ?? 0) > 0
                ? `Langues · ${profile.languages!.join(' · ')}`
                : 'Basé sur sessions & feedbacks'
            }
            chevron={false}
            left={<Ionicons name="ribbon-outline" size={20} color={colors.warning} />}
          />

          <View style={{ marginTop: spacing.md }}>
            <TeammateRatingsCard userId={profile.id} />
          </View>

          <AchievementsSection
            userId={profile.id}
            reliability={profile.reliability}
          />

          {!isSelf ? (
            <View style={styles.ctaBlock}>
              {!isFromDaily ? (
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
              ) : null}
              {isFromDaily ? (
                dailyDecision !== null ? (
                  <View style={[styles.dailyResult, {
                    backgroundColor: dailyDecision === 'accepted' ? withHexAlpha('#22C55E', 0.08) : withHexAlpha('#EF4444', 0.08),
                    borderColor: dailyDecision === 'accepted' ? '#22C55E' : '#EF4444',
                  }]}>
                    <Text style={{ color: dailyDecision === 'accepted' ? '#22C55E' : '#EF4444', fontFamily: fonts.bodyBold, fontSize: 15, textAlign: 'center' }}>
                      {dailyDecision === 'accepted' ? '✓ Vous avez accepté ce jumelo' : '✕ Vous avez refusé ce jumelo'}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.dailyBtnRow}>
                    <Pressable
                      disabled={dailyBusy}
                      onPress={async () => {
                        if (!me || dailyBusy) return;
                        setDailyBusy(true);
                        try {
                          await refuseDailyJumelo(me.id);
                          setDailyDecision('refused');
                          router.back();
                        } finally { setDailyBusy(false); }
                      }}
                      style={[styles.dailyBtn, { backgroundColor: '#EF4444', borderColor: '#EF4444' }]}
                    >
                      <Text style={{ color: '#fff', fontFamily: fonts.bodyBold, fontSize: 15 }}>✕ Refuser</Text>
                    </Pressable>
                    <Pressable
                      disabled={dailyBusy}
                      onPress={async () => {
                        if (!me || dailyBusy) return;
                        setDailyBusy(true);
                        try {
                          await acceptDailyJumelo(me, mockUsers);
                          setDailyDecision('accepted');
                          router.back();
                        } finally { setDailyBusy(false); }
                      }}
                      style={[styles.dailyBtn, { backgroundColor: '#22C55E', borderColor: '#22C55E', flex: 1 }]}
                    >
                      <Text style={{ color: '#fff', fontFamily: fonts.bodyBold, fontSize: 15 }}>✓ Accepter</Text>
                    </Pressable>
                  </View>
                )
              ) : null}
              <Button
                label="Signaler ce profil"
                icon="flag-outline"
                variant="ghost"
                onPress={() => setReportOpen(true)}
                style={{ marginTop: spacing.sm }}
              />
            </View>
          ) : (
            <Text style={[styles.selfHint, { color: colors.inkMuted }]}>
              C’est ton profil public.
            </Text>
          )}
        </ScrollView>

        <Modal visible={reportOpen} transparent animationType="none">
          <Pressable
            style={styles.reportBackdrop}
            onPress={() => !reportBusy && setReportOpen(false)}
          >
            <Animated.View entering={SlideInDown.springify().damping(80).stiffness(250)} style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
            <Pressable
              style={[styles.reportSheet, { backgroundColor: colors.cream }]}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={[styles.section, { color: colors.ink, marginTop: 0 }]}>
                Signaler {profile.name}
              </Text>
              <Text style={{ fontFamily: fonts.body, color: colors.inkMuted, marginBottom: 12 }}>
                Choisis une raison. Le signalement part à la modération Jumelo.
              </Text>
              <View style={styles.wrap}>
                {REPORT_REASONS.map((r) => (
                  <Chip
                    key={r.id}
                    label={r.label}
                    selected={reportReason === r.id}
                    onPress={() => setReportReason(r.id)}
                  />
                ))}
              </View>
              <TextInput
                value={reportDetails}
                onChangeText={setReportDetails}
                placeholder="Précisions (optionnel)"
                placeholderTextColor={colors.inkFaint}
                multiline
                style={[
                  styles.reportInput,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.white,
                    color: colors.ink,
                  },
                ]}
              />
              <Button
                label="Envoyer le signalement"
                loading={reportBusy}
                onPress={async () => {
                  if (!me) {
                    Alert.alert('Connexion requise', 'Connecte-toi pour signaler.');
                    return;
                  }
                  setReportBusy(true);
                  const result = await reportUser({
                    reporterId: me.id,
                    reporterName: me.name,
                    targetId: profile.id,
                    targetName: profile.name,
                    reasonId: reportReason,
                    details: reportDetails,
                  });
                  setReportBusy(false);
                  if (!result.ok) {
                    Alert.alert('Impossible', result.error);
                    return;
                  }
                  setReportOpen(false);
                  setReportDetails('');
                  Alert.alert(
                    'Merci',
                    'Signalement envoyé. L’équipe modération le verra dans l’admin.',
                  );
                }}
              />
              <Button
                label="Annuler"
                variant="ghost"
                onPress={() => setReportOpen(false)}
                style={{ marginTop: 8 }}
              />
            </Pressable>
            </Animated.View>
          </Pressable>
        </Modal>
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
  heroPersona: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: spacing.md,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
  },
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
  ctaBlock: { marginTop: spacing.xl },
  dailyBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.sm,
  },
  dailyBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dailyResult: {
    borderRadius: 24,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  selfHint: {
    marginTop: spacing.xl,
    textAlign: 'center',
    fontFamily: fonts.body,
  },
  reportBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(20,28,36,0.45)',
  },
  reportSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  reportInput: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    minHeight: 80,
    marginVertical: spacing.md,
    fontFamily: fonts.body,
    textAlignVertical: 'top',
  },
});
