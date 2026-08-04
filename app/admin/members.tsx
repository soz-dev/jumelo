import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { SettingsBackHeader } from '../../src/components/SettingsChrome';
import {
  Avatar,
  EmptyState,
  ListRow,
  Screen,
  spacing,
  typography,
} from '../../src/design-system';
import { useTheme } from '../../src/context/ThemeContext';
import { listAdminMembers, type AdminMember } from '../../src/lib/adminStore';

export default function AdminMembersScreen() {
  const { colors } = useTheme();
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listAdminMembers();
      setMembers(rows);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => undefined);
    }, [load]),
  );

  const filtered = members.filter((m) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q)
    );
  });

  return (
    <Screen>
      <SettingsBackHeader title="Membres" subtitle="Recherche · modération" />
      <View style={[styles.searchWrap, { backgroundColor: colors.white }]}>
        <Ionicons name="search" size={18} color={colors.inkFaint} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher un membre…"
          placeholderTextColor={colors.inkFaint}
          style={[styles.search, { color: colors.ink }]}
        />
      </View>
      {loading && members.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />
          }
        >
          <Text style={[styles.count, { color: colors.inkMuted }]}>
            {filtered.length} membre{filtered.length > 1 ? 's' : ''}
          </Text>
          {filtered.length === 0 ? (
            <EmptyState
              title="Aucun membre"
              description="Les profils démo et Supabase apparaissent ici."
              lottie="spark"
            />
          ) : (
            filtered.map((m) => (
              <ListRow
                key={m.id}
                title={`${m.name}${m.banned ? ' · BAN' : m.suspended ? ' · SUSPENDU' : ''}`}
                subtitle={`${m.email} · ${m.source}${m.warnCount ? ` · ⚠ ${m.warnCount}` : ''}`}
                left={
                  <Avatar name={m.name} photo={m.photo} color={m.avatarColor} size={44} />
                }
                onPress={() => router.push(`/admin/${m.id}`)}
              />
            ))
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 14,
  },
  search: {
    flex: 1,
    fontFamily: typography.body.fontFamily,
    fontSize: 16,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  count: {
    ...typography.overline,
    marginBottom: spacing.md,
  },
});
