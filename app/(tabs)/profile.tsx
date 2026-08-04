import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AchievementsSection } from '../../src/components/AchievementsSection';
import { CategoryIcon } from '../../src/components/CategoryIcon';
import { ProfileAvatarEditor } from '../../src/components/ProfileAvatarEditor';
import { ProfileStatsCard } from '../../src/components/ProfileStatsCard';
import { TeammateRatingsCard } from '../../src/components/TeammateRatingsCard';
import { ThemeSwitcherButton } from '../../src/components/ThemeSwitcher';
import {
  Avatar,
  Chip,
  HeaderRow,
  Icon,
  ListRow,
  Screen,
  elevation,
  fonts,
  radii,
  spacing,
  typography,
  withHexAlpha,
} from '../../src/design-system';
import { getCategory } from '../../src/constants/catalog';
import { useAuth } from '../../src/context/AuthContext';
import { useTeams } from '../../src/context/TeamsContext';
import { useTheme } from '../../src/context/ThemeContext';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const { myActiveTeams } = useTeams();
  const [avatarOpen, setAvatarOpen] = useState(false);
  if (!user) return null;
  const profileTeams = myActiveTeams.slice(0, 4);

  const onLogout = async () => {
    await logout();
    router.replace('/(auth)/welcome');
  };

  return (
    <Screen atmosphere="soft">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <HeaderRow
          title="Profil"
          subtitle="Ton identité Jumelo"
          right={
            <View style={styles.actions}>
              <ThemeSwitcherButton />
              <Pressable
                style={[styles.gear, { backgroundColor: colors.white, borderColor: colors.border }]}
                onPress={() => router.push('/settings')}
                accessibilityRole="button"
                accessibilityLabel="Paramètres"
              >
                <Ionicons name="settings-outline" size={20} color={colors.inkMuted} />
              </Pressable>
            </View>
          }
        />

        <Animated.View entering={FadeInDown.duration(380)}>
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.hero, elevation.glow(colors.primary)]}
          >
            <Pressable
              onPress={() => setAvatarOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Changer photo ou avatar"
              style={styles.avatarTap}
            >
              <Avatar
                name={user.name}
                photo={user.photo}
                personaId={user.avatarPersonaId}
                color={user.avatarColor}
                size={96}
                online={user.online}
              />
              <View style={[styles.cameraBadge, { backgroundColor: colors.white }]}>
                <Ionicons name="camera" size={16} color={colors.primary} />
              </View>
              <View style={[styles.relBadge, { backgroundColor: colors.accent }]}>
                <Text style={styles.relBadgeText}>{user.reliability}</Text>
              </View>
            </Pressable>
            <Text style={styles.name}>{user.name}</Text>
            <View style={styles.cityRow}>
              <Icon name="city" size={14} color="rgba(255,255,255,0.85)" />
              <Text style={styles.city}>{user.city || '—'}</Text>
            </View>
            <Text style={styles.tagline}>
              {user.bio || 'Nouveau sur Jumelo — compléter mon profil !'}
            </Text>
            <Pressable
              style={styles.completeBtn}
              onPress={() => router.push('/(onboarding)/univers')}
            >
              <Ionicons name="pencil" size={16} color={colors.primary} />
              <Text style={[styles.completeText, { color: colors.primary }]}>
                Compléter mon profil
              </Text>
            </Pressable>
            <Pressable
              style={styles.avatarHintBtn}
              onPress={() => setAvatarOpen(true)}
            >
              <Text style={styles.avatarHintText}>Changer photo / avatar</Text>
            </Pressable>
          </LinearGradient>
        </Animated.View>

        <ProfileStatsCard userId={user.id} />

        <Text style={[styles.section, { color: colors.ink }]}>Univers</Text>
        <View style={styles.wrap}>
          {user.universes.map((id) => {
            const cat = getCategory(id);
            return (
              <Chip
                key={id}
                name={id}
                label={cat?.shortLabel ?? id}
                selected
              />
            );
          })}
        </View>

        <Text style={[styles.section, { color: colors.ink }]}>Intérêts & niveau</Text>
        {user.interests.map((interest) => (
          <ListRow
            key={interest}
            title={interest}
            right={
              <View style={[styles.levelPill, { backgroundColor: colors.primarySoft }]}>
                <Text style={{ fontFamily: fonts.bodyMedium, color: colors.primaryDark }}>
                  {user.level}
                </Text>
              </View>
            }
          />
        ))}

        <Text style={[styles.section, { color: colors.ink }]}>Vibe & objectifs</Text>
        <View style={styles.wrap}>
          {user.vibes.map((vibe) => (
            <Chip key={vibe} name={vibe} label={vibe} selected />
          ))}
          {user.objectives.map((o) => (
            <Chip key={o} label={o} />
          ))}
        </View>

        <TeammateRatingsCard userId={user.id} compact />

        <Text style={[styles.section, { color: colors.ink }]}>Équipes actives</Text>
        {profileTeams.length === 0 ? (
          <ListRow
            title="Aucune équipe"
            subtitle="Rejoins un lobby pour le voir ici"
            left={<Ionicons name="people-outline" size={20} color={colors.inkMuted} />}
            onPress={() => router.push('/(tabs)/teams')}
          />
        ) : (
          profileTeams.map((team) => (
            <ListRow
              key={team.id}
              title={team.name}
              subtitle={team.activity}
              left={<CategoryIcon universeId={team.universe} />}
              right={
                <Text
                  style={{
                    fontFamily: fonts.bodyMedium,
                    color: colors.inkMuted,
                    fontSize: 13,
                  }}
                >
                  {team.membersCount}/{team.capacity}
                </Text>
              }
              onPress={() => router.push(`/team/${team.id}`)}
            />
          ))
        )}

        <AchievementsSection userId={user.id} reliability={user.reliability} />

        <View
          style={[
            styles.reliability,
            {
              backgroundColor: withHexAlpha(colors.white, 0.55),
              borderColor: withHexAlpha(colors.warning, 0.28),
            },
          ]}
        >
          <View
            style={[
              styles.reliabilityIcon,
              { backgroundColor: withHexAlpha(colors.warning, 0.16) },
            ]}
          >
            <Ionicons name="ribbon" size={22} color={colors.warning} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.bodyBold, color: colors.ink, fontSize: 15 }}>
              Score de fiabilité
            </Text>
            <Text style={{ fontFamily: fonts.body, color: colors.inkMuted, fontSize: 13 }}>
              Basé sur tes sessions & feedbacks
            </Text>
          </View>
          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: 30,
              letterSpacing: -0.6,
              color: colors.primary,
            }}
          >
            {user.reliability}
          </Text>
        </View>

        <Text style={[styles.section, { color: colors.ink }]}>Langues</Text>
        <View style={styles.wrap}>
          {(user.languages ?? ['Français']).map((lang) => (
            <Chip key={lang} name="language" label={lang} selected />
          ))}
        </View>

        <View style={{ marginTop: spacing.lg }}>
          <ListRow
            title="Modifier mes intérêts"
            left={<Ionicons name="layers-outline" size={20} color={colors.ink} />}
            onPress={() => router.push('/categories')}
          />
          <ListRow
            title="Paramètres & confidentialité"
            left={<Ionicons name="settings-outline" size={20} color={colors.ink} />}
            onPress={() => router.push('/settings')}
          />
          <ListRow
            title="Se déconnecter"
            danger
            left={<Ionicons name="log-out-outline" size={20} color={colors.accent} />}
            onPress={onLogout}
          />
        </View>

        <Text style={[styles.footer, { color: colors.inkFaint }]}>
          Jumelo · Trouve ton Jumelo
        </Text>
      </ScrollView>

      <ProfileAvatarEditor visible={avatarOpen} onClose={() => setAvatarOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  actions: { flexDirection: 'row', gap: 8 },
  gear: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginTop: spacing.md,
    gap: spacing.sm,
    overflow: 'hidden',
  },
  avatarTap: { position: 'relative' },
  cameraBadge: {
    position: 'absolute',
    left: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  relBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  relBadgeText: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 12 },
  name: {
    fontFamily: fonts.displaySemi,
    fontSize: 28,
    letterSpacing: -0.5,
    marginTop: spacing.sm,
    color: '#fff',
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  city: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
  tagline: {
    fontFamily: fonts.body,
    textAlign: 'center',
    lineHeight: 21,
    color: 'rgba(255,255,255,0.9)',
    maxWidth: 300,
  },
  completeBtn: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radii.pill,
    paddingHorizontal: 18,
    paddingVertical: 13,
    backgroundColor: '#fff',
  },
  completeText: { fontFamily: fonts.bodyBold },
  avatarHintBtn: {
    paddingVertical: 4,
  },
  avatarHintText: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  section: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    ...typography.section,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  levelPill: {
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  reliability: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  reliabilityIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    textAlign: 'center',
    marginTop: spacing.xl,
    fontFamily: fonts.body,
    fontSize: 13,
  },
});
