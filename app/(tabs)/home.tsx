import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Atmosphere } from '../../src/components/Atmosphere';
import { CategoryIcon } from '../../src/components/CategoryIcon';
import { BrandLogo } from '../../src/components/BrandLogo';
import { ThemeSwitcherButton } from '../../src/components/ThemeSwitcher';
import { useAuth } from '../../src/context/AuthContext';
import { useTeams } from '../../src/context/TeamsContext';
import { useTheme } from '../../src/context/ThemeContext';
import { mockUsers } from '../../src/data/mock';
import {
  Icon,
  ListRow,
  SectionHeader,
  elevation,
  fonts,
  motion,
  radii,
  spacing,
  themeBrandColors,
  themeGradientAngles,
  typography,
} from '../../src/design-system';
import {
  listIncomingDailyAccepts,
  seedIncomingDailyAccept,
} from '../../src/lib/dailyJumelo';
import {
  ensureDemoIncomingLikes,
  type ActivityItem,
} from '../../src/lib/likesStore';
import { usePremiumAccess } from '../../src/lib/premiumStore';
import { isDuoCapacity } from '../../src/lib/teamKind';

const showDemoTools = typeof __DEV__ !== 'undefined' && __DEV__;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ScalePressable({
  onPress,
  style,
  children,
}: {
  onPress: () => void;
  style?: object;
  children: ReactNode;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.98, motion.spring);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, motion.spring);
      }}
      style={[style, animStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { myActiveTeams } = useTeams();
  const { colors } = useTheme();
  const { guard } = usePremiumAccess();
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [unreadLikes, setUnreadLikes] = useState(0);
  const [seedHint, setSeedHint] = useState<string | null>(null);

  const goDailyJumelo = () => {
    if (!guard()) return;
    router.push('/(tabs)/discover');
  };

  const refreshActivity = useCallback(async (userId: string) => {
    // Nettoie les anciennes invites Discover seedées (Maxime, etc.).
    await ensureDemoIncomingLikes(userId);
    const incoming = await listIncomingDailyAccepts(userId);
    const items: ActivityItem[] = incoming.map((row) => {
      const peer = mockUsers.find((u) => u.id === row.fromUserId);
      const name = peer?.name ?? 'Quelqu’un';
      return {
        id: `daily-${row.fromUserId}-${row.at}`,
        kind: 'incoming_like' as const,
        text: `${name} t’a proposé`,
        time: 'aujourd’hui',
        color: '#2F6BFF',
        userId: row.fromUserId,
        unread: true,
      };
    });
    setActivity(items);
    setUnreadLikes(items.length);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      void refreshActivity(user.id);
    }, [user, refreshActivity]),
  );

  if (!user) return null;

  const myDuos = myActiveTeams.filter((t) => isDuoCapacity(t.capacity)).slice(0, 3);
  const firstName = user.name?.split(' ')[0] ?? '';

  const onSeedIncoming = async () => {
    await seedIncomingDailyAccept(user.id, 'u-maxime');
    await refreshActivity(user.id);
    setSeedHint('Maxime t’a accepté — ouvre Du jour');
    Alert.alert(
      'Cas de test : proposition reçue',
      'Maxime t’a proposé. Ouvre l’onglet Du jour pour accepter ou refuser (match mutuel).',
      [
        { text: 'Plus tard', style: 'cancel' },
        { text: 'Du jour', onPress: goDailyJumelo },
      ],
    );
  };

  return (
    <Atmosphere variant="bold">
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(380)} style={styles.topRow}>
            <View style={{ flex: 1, paddingRight: spacing.sm }}>
              <View style={styles.brandRow}>
                <BrandLogo size={40} />
                <Text style={[styles.brand, { color: colors.primary }]}>Jumelo</Text>
              </View>
              <Text style={[styles.hello, { color: colors.inkMuted }]}>
                {firstName ? `Salut ${firstName}` : 'Bienvenue'}
              </Text>
              <Text style={[styles.headline, { color: colors.primaryDark }]}>
                Trouve{'\n'}
                <Text style={[styles.headlineAccent, { color: colors.primary }]}>quelqu’un</Text>
              </Text>
            </View>
            <View style={styles.topActions}>
              <Pressable
                onPress={goDailyJumelo}
                style={[
                  styles.notifBtn,
                  { backgroundColor: 'rgba(255,255,255,0.72)', borderColor: colors.border },
                ]}
                accessibilityLabel="Invites reçues"
              >
                <Icon name="social" size={20} color={colors.accent} weight="fill" />
                {unreadLikes > 0 ? (
                  <View style={[styles.notifBadge, { backgroundColor: colors.accent }]}>
                    <Text style={styles.notifBadgeText}>
                      {unreadLikes > 9 ? '9+' : unreadLikes}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
              <ThemeSwitcherButton />
            </View>
          </Animated.View>

          {showDemoTools ? (
            <Animated.View entering={FadeInDown.delay(40).duration(320)} style={styles.demoTools}>
              <Text style={[styles.demoLabel, { color: colors.inkFaint }]}>DEV · cas de test</Text>
              <View style={styles.demoRow}>
                <Pressable
                  onPress={onSeedIncoming}
                  style={[styles.demoBtn, { borderColor: colors.border }]}
                >
                  <Icon name="pulse" size={14} color={colors.inkFaint} weight="bold" />
                  <Text style={[styles.demoBtnText, { color: colors.inkFaint }]}>
                    Proposition reçue
                  </Text>
                </Pressable>
              </View>
              {seedHint ? (
                <Text style={[styles.seedHint, { color: colors.inkMuted }]}>{seedHint}</Text>
              ) : null}
            </Animated.View>
          ) : null}

          <Animated.View entering={FadeInDown.delay(80).duration(380)}>
            <ScalePressable
              onPress={() => router.push('/(tabs)/teams')}
              style={[styles.entryPressFull, elevation.glow(colors.primary)]}
            >
              <LinearGradient
                colors={[...themeBrandColors(colors)]}
                start={themeGradientAngles.brand.start}
                end={themeGradientAngles.brand.end}
                style={styles.entryCardFull}
              >
                <View style={styles.entryIconWrap}>
                  <Icon name="social" size={26} color="#fff" weight="fill" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.entryTitle}>Trouve ton jumelo</Text>
                  <Text style={styles.entrySub}>
                    Quelqu’un pour jouer, progresser ou s’amuser avec toi
                  </Text>
                </View>
                <View style={styles.entryCta}>
                  <Text style={styles.entryCtaText}>Lobby</Text>
                  <Icon name="chevronRight" size={14} color="#fff" weight="bold" />
                </View>
              </LinearGradient>
            </ScalePressable>
          </Animated.View>

          <SectionHeader
            title="Aujourd’hui"
            subtitle="1 proposition · 24 h · accepte ou refuse"
          />

          <ScalePressable
            onPress={() => {
              if (!guard()) return;
              router.push('/(tabs)/discover');
            }}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.dailyCta, elevation.lift]}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.dailyCtaTitle}>Ta proposition</Text>
                <Text style={styles.dailyCtaBody}>
                  Accepte ou refuse — si c’est mutuel, vous avez 72 h pour former l’équipe.
                </Text>
              </View>
              <View style={styles.entryCta}>
                <Text style={styles.entryCtaText}>Voir</Text>
                <Icon name="chevronRight" size={14} color="#fff" weight="bold" />
              </View>
            </LinearGradient>
          </ScalePressable>

          <SectionHeader
            title="Tes partenaires"
            subtitle="En cours en ce moment"
            actionLabel="Lobby"
            onAction={() => router.push('/(tabs)/teams')}
          />

          {myDuos.length === 0 ? (
            <ListRow
              title="Aucun partenaire pour l’instant"
              subtitle="Crée le tien et invite quelqu’un"
              left={<Icon name="social" size={20} color={colors.inkMuted} />}
              onPress={() => router.push('/team/create')}
            />
          ) : (
            myDuos.map((team) => (
              <ListRow
                key={team.id}
                title={team.name}
                subtitle={team.activity}
                left={<CategoryIcon universeId={team.universe} />}
                right={
                  <View style={styles.members}>
                    <Icon name="social" size={14} color={colors.inkMuted} />
                    <Text style={{ color: colors.inkMuted, fontFamily: fonts.bodyMedium }}>
                      {team.membersCount}/{team.capacity}
                    </Text>
                  </View>
                }
                onPress={() => router.push(`/team/${team.id}`)}
              />
            ))
          )}

          <SectionHeader
            title="Activité récente"
            actionLabel={
              unreadLikes > 0 ? `${unreadLikes} en attente` : 'Du jour'
            }
            onAction={goDailyJumelo}
          />
          {activity.length === 0 ? (
            <ListRow
              title="Rien pour l’instant"
              subtitle="Les propositions du jour apparaissent ici"
              left={<Icon name="discover" size={20} color={colors.inkMuted} />}
              onPress={goDailyJumelo}
            />
          ) : (
            activity.map((item) => (
              <ListRow
                key={item.id}
                title={item.text}
                subtitle={item.time}
                left={
                  <View style={styles.dotWrap}>
                    <View style={[styles.dot, { backgroundColor: item.color }]} />
                    {item.unread ? (
                      <View style={[styles.unreadRing, { borderColor: colors.accent }]} />
                    ) : null}
                  </View>
                }
                chevron
                onPress={goDailyJumelo}
              />
            ))
          )}

          <ScalePressable
            onPress={() => router.push('/categories')}
            style={[styles.categoriesPress, elevation.glow(colors.primary)]}
          >
            <LinearGradient
              colors={[...themeBrandColors(colors)]}
              start={themeGradientAngles.brand.start}
              end={themeGradientAngles.brand.end}
              style={styles.categoriesCta}
            >
              <View style={styles.categoriesIcon}>
                <Icon name="spark" size={18} color={colors.white} weight="bold" />
              </View>
              <Text style={styles.categoriesLabel}>Parcourir les catégories</Text>
              <Icon name="chevronRight" size={16} color={colors.white} weight="bold" />
            </LinearGradient>
          </ScalePressable>
        </ScrollView>
      </SafeAreaView>
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  brand: {
    fontFamily: fonts.displaySoft,
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 0,
  },
  hello: {
    ...typography.caption,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
  headline: {
    ...typography.hero,
    fontSize: 48,
    lineHeight: 50,
    letterSpacing: -1.8,
    marginTop: 8,
  },
  headlineAccent: {
    fontFamily: fonts.display,
    letterSpacing: -2,
  },
  notifBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notifBadgeText: {
    color: '#fff',
    fontFamily: fonts.bodyBold,
    fontSize: 10,
  },
  demoTools: {
    marginBottom: spacing.md,
    gap: 6,
    opacity: 0.85,
  },
  demoLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  demoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  demoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  demoBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
  },
  seedHint: {
    fontFamily: fonts.body,
    fontSize: 12,
  },
  entryPressFull: {
    borderRadius: radii.xl,
    marginBottom: spacing.xl,
  },
  entryCardFull: {
    borderRadius: radii.xl,
    padding: spacing.md,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 108,
  },
  entryIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    marginBottom: 4,
  },
  entryTitle: {
    fontFamily: fonts.display,
    fontSize: 26,
    letterSpacing: -0.6,
    color: '#fff',
  },
  entrySub: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 4,
    flex: 1,
  },
  entryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  entryCtaText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: '#fff',
  },
  dailyCta: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  dailyCtaTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: '#fff',
    letterSpacing: -0.4,
  },
  dailyCtaBody: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.88)',
  },
  members: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dotWrap: { width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  unreadRing: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  categoriesPress: {
    marginTop: spacing.xl,
    borderRadius: radii.pill,
  },
  categoriesCta: {
    minHeight: 56,
    borderRadius: radii.pill,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    overflow: 'hidden',
  },
  categoriesIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoriesLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: '#fff',
    letterSpacing: 0.15,
  },
});
