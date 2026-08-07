import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  SettingsBackHeader,
  SettingsSectionLabel,
  SettingsToggleRow,
} from '../../src/components/SettingsChrome';
import { Screen, spacing, typography } from '../../src/design-system';
import { useTheme } from '../../src/context/ThemeContext';
import { useAuth } from '../../src/context/AuthContext';
import {
  getAdminDashboard,
  type AdminDashboard,
  clearAllBans,
  clearAllReports,
  clearAllWarnings,
} from '../../src/lib/adminStore';
import { resetDailyJumeloDemoState } from '../../src/lib/dailyJumelo';
import { resetJumeloValidationDemoState } from '../../src/lib/jumeloValidation';
import { usePremium, usePremiumGating } from '../../src/lib/premiumStore';

type NavItem = {
  href: '/admin/members' | '/admin/teams' | '/admin/reports' | '/admin/activity' | '/admin/moderateurs';
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  accent?: string;
};

const NAV: NavItem[] = [
  {
    href: '/admin/members',
    icon: 'people',
    title: 'Membres',
    subtitle: 'Liste, ban, message, avatar',
  },
  {
    href: '/admin/teams',
    icon: 'shield',
    title: 'Équipes',
    subtitle: 'Dissoudre, renommer, masquer',
  },
  {
    href: '/admin/reports',
    icon: 'flag',
    title: 'Signalements',
    subtitle: 'File de modération',
  },
  {
    href: '/admin/activity',
    icon: 'time',
    title: 'Journal',
    subtitle: 'Actions admin (local)',
  },
  {
    href: '/admin/moderateurs',
    icon: 'shield-checkmark',
    title: 'Modérateurs',
    subtitle: 'Droits de modération par UID Firebase',
  },
];

export default function AdminDashboardScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { gatingEnabled, setGatingEnabled, ready: gatingReady } = usePremiumGating();
  const { isPremium, setPremium, ready: premiumReady } = usePremium();
  const [dash, setDash] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [toolBusy, setToolBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDash(await getAdminDashboard(user?.id));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => undefined);
    }, [load]),
  );

  const stats = [
    { label: 'Membres', value: dash?.users ?? '—', icon: 'people-outline' as const },
    { label: 'Équipes', value: dash?.teams ?? '—', icon: 'game-controller-outline' as const },
    {
      label: 'En attente',
      value: dash?.reportsPending ?? '—',
      icon: 'alert-circle-outline' as const,
    },
    { label: 'Bannis', value: dash?.banned ?? '—', icon: 'ban-outline' as const },
  ];

  return (
    <Screen>
      <SettingsBackHeader
        title="Admin Jumelo"
        subtitle="Modération · accès restreint"
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />
        }
      >
        {loading && !dash ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
        ) : (
          <>
            <View style={styles.statsGrid}>
              {stats.map((s) => (
                <View
                  key={s.label}
                  style={[
                    styles.statCard,
                    { backgroundColor: colors.white, borderColor: colors.border },
                  ]}
                >
                  <Ionicons name={s.icon} size={18} color={colors.primary} />
                  <Text style={[styles.statValue, { color: colors.ink }]}>{s.value}</Text>
                  <Text style={[styles.statLabel, { color: colors.inkMuted }]}>{s.label}</Text>
                </View>
              ))}
            </View>

            <Text style={[styles.meta, { color: colors.inkFaint }]}>
              Suspendus {dash?.suspended ?? 0} · Équipes masquées {dash?.hiddenTeams ?? 0} ·
              Warnings {dash?.warnings ?? 0} · Signalements {dash?.reportsTotal ?? 0}
            </Text>

            <SettingsSectionLabel label="Premium / paywall" />
            {gatingReady ? (
              <SettingsToggleRow
                icon="lock-closed-outline"
                label="Mode premium (paywall actif)"
                hint="Bloque invites & profils pour les non-premium"
                value={gatingEnabled}
                onValueChange={(v) => {
                  setGatingEnabled(v, user?.name ?? 'admin').catch(() => undefined);
                }}
              />
            ) : null}
            {premiumReady ? (
              <SettingsToggleRow
                icon="diamond-outline"
                label="Premium sur mon compte"
                hint={
                  isPremium
                    ? 'Ce compte contourne le paywall'
                    : 'Ce compte est traité comme non-premium'
                }
                value={isPremium}
                onValueChange={(v) => {
                  setPremium(v, 'mon compte').catch(() => undefined);
                }}
              />
            ) : null}

            <Text style={[styles.section, { color: colors.ink }]}>Sections</Text>
            {NAV.map((item) => (
              <Pressable
                key={item.href}
                onPress={() => router.push(item.href)}
                style={[
                  styles.navRow,
                  { backgroundColor: colors.white, borderColor: colors.border },
                ]}
              >
                <View style={[styles.navIcon, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name={item.icon} size={20} color={colors.primaryDark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.navTitle, { color: colors.ink }]}>{item.title}</Text>
                  <Text style={{ color: colors.inkMuted, fontFamily: typography.body.fontFamily }}>
                    {item.subtitle}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
              </Pressable>
            ))}

            {/* ─── Outils de simulation ─── */}
            <Text style={[styles.section, { color: colors.ink }]}>Outils de simulation</Text>
            {([
              {
                id: 'reset_daily',
                icon: 'refresh-circle-outline' as const,
                label: 'Réinitialiser le Jumelo du jour',
                hint: 'Efface lock 24h + trial + validation — nouvelle proposition immédiate',
                action: async () => {
                  await resetDailyJumeloDemoState();
                  await resetJumeloValidationDemoState();
                  Alert.alert('✓ Réinitialisé', 'Nouvelle proposition disponible immédiatement.', [{ text: 'Retour', onPress: () => router.back() }]);
                },
                confirm: 'Remettre à zéro le Jumelo du jour ?',
              },
              {
                id: 'reset_validation',
                icon: 'git-compare-outline' as const,
                label: 'Réinitialiser la validation de jumelage',
                hint: 'Efface les confirmations de formation (démo)',
                action: async () => { await resetJumeloValidationDemoState(); },
                confirm: 'Réinitialiser la validation ?',
              },
              {
                id: 'clear_bans',
                icon: 'lock-open-outline' as const,
                label: 'Lever tous les bans',
                hint: 'Supprime tous les bans et suspensions locaux',
                action: async () => { await clearAllBans(); await load(); },
                confirm: 'Lever tous les bans ?',
                danger: true,
              },
              {
                id: 'clear_reports',
                icon: 'flag-outline' as const,
                label: 'Effacer tous les signalements',
                hint: 'Vide la file de modération locale',
                action: async () => { await clearAllReports(); await load(); },
                confirm: 'Effacer tous les signalements ?',
                danger: true,
              },
              {
                id: 'clear_warnings',
                icon: 'alert-circle-outline' as const,
                label: 'Effacer tous les avertissements',
                hint: "Supprime l'historique des warnings locaux",
                action: async () => { await clearAllWarnings(); await load(); },
                confirm: 'Effacer tous les avertissements ?',
                danger: true,
              },
            ] as const).map((tool) => (
              <Pressable
                key={tool.id}
                disabled={toolBusy === tool.id}
                onPress={() => {
                  Alert.alert(
                    tool.label,
                    tool.confirm,
                    [
                      { text: 'Annuler', style: 'cancel' },
                      {
                        text: 'Confirmer',
                        style: tool.danger ? 'destructive' : 'default',
                        onPress: async () => {
                          setToolBusy(tool.id);
                          await tool.action().catch(() => undefined);
                          setToolBusy(null);
                        },
                      },
                    ],
                  );
                }}
                style={[
                  styles.navRow,
                  {
                    backgroundColor: colors.white,
                    borderColor: tool.danger ? colors.accentSoft : colors.border,
                    opacity: toolBusy === tool.id ? 0.6 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.navIcon,
                    { backgroundColor: tool.danger ? colors.accentSoft : colors.primarySoft },
                  ]}
                >
                  <Ionicons
                    name={tool.icon}
                    size={20}
                    color={tool.danger ? colors.accent : colors.primaryDark}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.navTitle,
                      { color: tool.danger ? colors.accent : colors.ink },
                    ]}
                  >
                    {tool.label}
                  </Text>
                  <Text style={{ color: colors.inkMuted, fontFamily: typography.body.fontFamily }}>
                    {tool.hint}
                  </Text>
                </View>
                {toolBusy === tool.id ? (
                  <Ionicons name="hourglass-outline" size={18} color={colors.inkFaint} />
                ) : (
                  <Ionicons name="play-circle-outline" size={18} color={colors.inkFaint} />
                )}
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '47%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
    gap: 4,
  },
  statValue: {
    fontFamily: typography.display.fontFamily,
    fontSize: 28,
  },
  statLabel: {
    ...typography.caption,
  },
  meta: {
    ...typography.caption,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  section: {
    ...typography.section,
    marginBottom: spacing.sm,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  navIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontFamily: typography.bodyBold.fontFamily,
    fontSize: 16,
  },
});
