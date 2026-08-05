import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Atmosphere } from '../../src/components/Atmosphere';
import { fonts, radii, spacing } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { mockUsers } from '../../src/data/mock';
import {
  listIncomingDailyAccepts,
  type IncomingDailyAccept,
} from '../../src/lib/dailyJumelo';
import { safeBack } from '../../src/lib/navigation';

export default function LikesInboxScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [rows, setRows] = useState<IncomingDailyAccept[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!user) {
        setRows([]);
        return () => {
          active = false;
        };
      }
      (async () => {
        const incoming = await listIncomingDailyAccepts(user.id);
        if (active) setRows(incoming);
      })();
      return () => {
        active = false;
      };
    }, [user]),
  );

  if (!user) return null;

  return (
    <Atmosphere variant="soft">
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => safeBack('/(tabs)/home')}
            style={[styles.iconBtn, { backgroundColor: colors.white, borderColor: colors.border }]}
          >
            <Ionicons name="arrow-back" size={20} color={colors.ink} />
          </Pressable>
          <Text style={[styles.title, { color: colors.ink }]}>Propositions</Text>
          <View style={{ width: 40 }} />
        </View>

        {rows === null ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={[styles.intro, { color: colors.inkMuted }]}>
              Quelqu’un t’a proposé ? Réponds dans l’onglet Du jour (acceptation mutuelle
              requise).
            </Text>
            {rows.length === 0 ? (
              <View
                style={[styles.empty, { backgroundColor: colors.white, borderColor: colors.border }]}
              >
                <Ionicons name="compass-outline" size={36} color={colors.inkFaint} />
                <Text style={[styles.emptyTitle, { color: colors.ink }]}>
                  Aucune proposition en attente
                </Text>
                <Text
                  style={{ color: colors.inkMuted, fontFamily: fonts.body, textAlign: 'center' }}
                >
                  Ouvre Du jour pour voir ta carte.
                </Text>
                <Pressable
                  onPress={() => router.replace('/(tabs)/discover')}
                  style={[styles.cta, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.ctaLabel}>Du jour</Text>
                </Pressable>
              </View>
            ) : (
              rows.map((row) => {
                const peer = mockUsers.find((u) => u.id === row.fromUserId);
                const name = peer?.name ?? 'Profil';
                const photo =
                  peer?.photo ??
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2F6BFF&color=fff&size=200`;
                return (
                  <Pressable
                    key={`${row.fromUserId}-${row.at}`}
                    onPress={() => router.push('/(tabs)/discover')}
                    style={[
                      styles.row,
                      { backgroundColor: colors.white, borderColor: colors.border },
                    ]}
                  >
                    <Image source={{ uri: photo }} style={styles.avatar} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowTitle, { color: colors.ink }]}>
                        {name} t’a proposé
                      </Text>
                      <Text style={{ color: colors.inkMuted, fontFamily: fonts.body, fontSize: 13 }}>
                        Aujourd’hui · réponds dans Du jour
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.displaySemi,
    fontSize: 18,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  intro: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  empty: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    textAlign: 'center',
  },
  cta: {
    marginTop: spacing.md,
    borderRadius: radii.pill,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  ctaLabel: {
    color: '#fff',
    fontFamily: fonts.bodyBold,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  rowTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
});
