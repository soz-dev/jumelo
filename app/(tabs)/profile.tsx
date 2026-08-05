import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AchievementsSection } from '../../src/components/AchievementsSection';
import { InterestTile } from '../../src/components/InterestTile';
import { ProfileAvatarEditor } from '../../src/components/ProfileAvatarEditor';
import { ProfileNameEditor } from '../../src/components/ProfileNameEditor';
import {
  ProfileQuickEditor,
  type ProfileQuickSection,
} from '../../src/components/ProfileQuickEditor';
import { ProfileDuosSection } from '../../src/components/ProfileDuosSection';
import { ProfileStatsCard } from '../../src/components/ProfileStatsCard';
import { TeammateRatingsCard } from '../../src/components/TeammateRatingsCard';
import { BrandLogo } from '../../src/components/BrandLogo';
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
  themeBrandColors,
  themeGradientAngles,
  typography,
  withHexAlpha,
} from '../../src/design-system';
import { getCategory, levels, vibes } from '../../src/constants/catalog';
import { CategoryIcon } from '../../src/components/CategoryIcon';
import { useAuth } from '../../src/context/AuthContext';
import { useTeams } from '../../src/context/TeamsContext';
import { useTheme } from '../../src/context/ThemeContext';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const { myActiveTeams } = useTeams();
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickSection, setQuickSection] =
    useState<ProfileQuickSection>('univers');
  if (!user) return null;

  const openQuick = (section: ProfileQuickSection) => {
    setQuickSection(section);
    setQuickOpen(true);
  };
  const levelLabel =
    levels.find((l) => l.id === user.level)?.label ?? user.level;

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
              <BrandLogo size={34} />
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
            colors={[...themeBrandColors(colors)]}
            start={themeGradientAngles.brand.start}
            end={themeGradientAngles.brand.end}
            style={[styles.hero, elevation.glow(colors.primary)]}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.2)', 'transparent', 'rgba(255,255,255,0.06)']}
              locations={[0, 0.45, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
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
            <Pressable
              onPress={() => setNameOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Modifier le pseudo"
              hitSlop={8}
              style={styles.nameTap}
            >
              <Text style={styles.name}>{user.name}</Text>
              <Ionicons name="pencil" size={16} color="rgba(255,255,255,0.85)" />
            </Pressable>
            <View style={styles.cityRow}>
              <Icon name="city" size={14} color="rgba(255,255,255,0.85)" />
              <Text style={styles.city}>
                {[user.age ? `${user.age} ans` : null, user.city || null]
                  .filter(Boolean)
                  .join(' · ') || '—'}
              </Text>
            </View>
            <Text style={styles.tagline}>
              {user.bio || 'Nouveau sur Jumelo — compléter mon profil !'}
            </Text>
            <Pressable
              style={styles.completeBtn}
              onPress={() => openQuick('univers')}
            >
              <Ionicons name="pencil" size={16} color={colors.primary} />
              <Text style={[styles.completeText, { color: colors.primary }]}>
                Éditer mon profil
              </Text>
            </Pressable>
            <Pressable
              style={styles.avatarHintBtn}
              onPress={() => setNameOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Modifier le pseudo"
            >
              <Text style={styles.avatarHintText}>Modifier le pseudo</Text>
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

        <ProfileDuosSection userId={user.id} teams={myActiveTeams} />

        <Pressable
          onPress={() => openQuick('univers')}
          accessibilityRole="button"
          accessibilityLabel="modifier les univers"
          style={styles.sectionTap}
        >
          <Text style={[styles.section, styles.sectionInTap, { color: colors.ink }]}>
            Univers
          </Text>
          <Ionicons name="pencil" size={16} color={colors.inkMuted} />
        </Pressable>
        <View style={styles.wrap}>
          {user.universes.length === 0 ? (
            <Chip
              label="Ajouter"
              tone="outline"
              onPress={() => openQuick('univers')}
            />
          ) : (
            user.universes.map((id) => {
              const cat = getCategory(id);
              return (
                <Chip
                  key={id}
                  name={id}
                  label={cat?.shortLabel ?? id}
                  selected
                  onPress={() => openQuick('univers')}
                />
              );
            })
          )}
        </View>

        <Pressable
          onPress={() => openQuick('interests')}
          accessibilityRole="button"
          accessibilityLabel="Modifier intérêts et niveau"
          style={styles.sectionTap}
        >
          <Text style={[styles.section, styles.sectionInTap, { color: colors.ink }]}>
            Intérêts & niveau
          </Text>
          <Ionicons name="pencil" size={16} color={colors.inkMuted} />
        </Pressable>
        {user.interests.length === 0 ? (
          <ListRow
            title="Aucun intérêt"
            subtitle="Ajoute tes jeux et activités"
            left={<Icon name="interest" size={20} color={colors.inkMuted} />}
            onPress={() => openQuick('interests')}
          />
        ) : (
          <Pressable onPress={() => openQuick('interests')}>
            {user.interests.map((interest) => (
              <InterestTile
                key={interest}
                interest={interest}
                levelLabel={levelLabel}
              />
            ))}
          </Pressable>
        )}
        <View style={styles.wrap}>
          <Chip
            label={levelLabel}
            selected
            onPress={() => openQuick('level')}
          />
        </View>

        <Pressable
          onPress={() => openQuick('vibes')}
          accessibilityRole="button"
          accessibilityLabel="Modifier vibes et objectifs"
          style={styles.sectionTap}
        >
          <Text style={[styles.section, styles.sectionInTap, { color: colors.ink }]}>
            Vibe & objectifs
          </Text>
          <Ionicons name="pencil" size={16} color={colors.inkMuted} />
        </Pressable>
        <View style={styles.wrap}>
          {user.vibes.map((vibe) => {
            const vibeOpt = vibes.find((v) => v.id === vibe);
            return (
              <Chip
                key={vibe}
                name={vibe}
                label={vibeOpt?.label ?? vibe}
                selected
                onPress={() => openQuick('vibes')}
              />
            );
          })}
          {user.objectives.map((o) => (
            <Chip
              key={o}
              label={o}
              tone="outline"
              onPress={() => openQuick('objectives')}
            />
          ))}
          {user.vibes.length === 0 && user.objectives.length === 0 ? (
            <Chip
              label="Ajouter"
              tone="outline"
              onPress={() => openQuick('vibes')}
            />
          ) : null}
        </View>

        <TeammateRatingsCard userId={user.id} compact />

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
            title="Édition rapide du profil"
            subtitle="Univers, intérêts, niveau, vibes, objectifs"
            left={<Ionicons name="layers-outline" size={20} color={colors.ink} />}
            onPress={() => openQuick('univers')}
          />
          <ListRow
            title="Mes catégories"
            subtitle="Choisir tes univers préférés"
            left={<Ionicons name="grid-outline" size={20} color={colors.ink} />}
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
          Jumelo · Trouve ton partenaire
        </Text>
      </ScrollView>

      <ProfileAvatarEditor visible={avatarOpen} onClose={() => setAvatarOpen(false)} />
      <ProfileNameEditor visible={nameOpen} onClose={() => setNameOpen(false)} />
      <ProfileQuickEditor
        visible={quickOpen}
        onClose={() => setQuickOpen(false)}
        initialSection={quickSection}
      />
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
  nameTap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.sm,
  },
  name: {
    fontFamily: fonts.displaySemi,
    fontSize: 28,
    letterSpacing: -0.5,
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
  sectionHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: -4,
    marginBottom: spacing.sm,
  },
  sectionTap: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionInTap: {
    marginTop: 0,
    marginBottom: 0,
    flex: 1,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
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
