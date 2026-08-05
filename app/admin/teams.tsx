import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { SettingsBackHeader } from '../../src/components/SettingsChrome';
import { Button, EmptyState, Screen, spacing, typography } from '../../src/design-system';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import {
  dissolveAdminTeam,
  hideAdminTeam,
  listAdminTeams,
  renameAdminTeam,
  type AdminTeamRow,
} from '../../src/lib/adminStore';

export default function AdminTeamsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [teams, setTeams] = useState<AdminTeamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTeams(await listAdminTeams(user?.id));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => undefined);
    }, [load]),
  );

  const onDissolve = (team: AdminTeamRow) => {
    Alert.alert(
      'Dissoudre l’équipe ?',
      `${team.displayName} sera supprimée (chef : ${team.ownerId}).`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Dissoudre',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            setBusy(true);
            const result = await dissolveAdminTeam(team.id, user.id);
            setBusy(false);
            if (!result.ok) Alert.alert('Erreur', result.error);
            await load();
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <SettingsBackHeader
        title="Équipes"
        subtitle="Modération des groupes"
        fallback="/admin"
      />
      {loading && teams.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />
          }
        >
          {teams.length === 0 ? (
            <EmptyState
              title="Aucune équipe"
              description="Les équipes démo / locales apparaissent ici."
              lottie="bolt"
            />
          ) : (
            teams.map((team) => (
              <View
                key={team.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.white,
                    borderColor: team.hidden ? colors.accent : colors.border,
                    opacity: team.hidden ? 0.75 : 1,
                  },
                ]}
              >
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: colors.ink }]}>
                      {team.displayName}
                      {team.hidden ? ' · MASQUÉE' : ''}
                    </Text>
                    <Text style={[styles.meta, { color: colors.inkMuted }]}>
                      {team.activity} · {team.membersCount}/{team.capacity} · {team.city}
                    </Text>
                    <Text style={[styles.meta, { color: colors.inkFaint }]}>
                      Chef : {team.ownerId}
                    </Text>
                  </View>
                  <Ionicons
                    name={team.universe === 'gaming' ? 'game-controller' : 'people'}
                    size={22}
                    color={colors.primary}
                  />
                </View>

                {renameId === team.id ? (
                  <View style={styles.renameBox}>
                    <TextInput
                      value={renameValue}
                      onChangeText={setRenameValue}
                      placeholder="Nouveau nom"
                      placeholderTextColor={colors.inkFaint}
                      style={[
                        styles.input,
                        {
                          color: colors.ink,
                          borderColor: colors.border,
                          backgroundColor: colors.cream,
                        },
                      ]}
                    />
                    <Button
                      label="Enregistrer"
                      loading={busy}
                      onPress={async () => {
                        setBusy(true);
                        const result = await renameAdminTeam(team.id, renameValue);
                        setBusy(false);
                        if (!result.ok) {
                          Alert.alert('Erreur', result.error);
                          return;
                        }
                        setRenameId(null);
                        await load();
                      }}
                    />
                  </View>
                ) : null}

                <View style={styles.actions}>
                  <Pressable
                    style={[styles.chip, { borderColor: colors.border }]}
                    onPress={() => {
                      setRenameId(team.id);
                      setRenameValue(team.displayName);
                    }}
                  >
                    <Text style={{ color: colors.ink, fontFamily: typography.bodyMd.fontFamily }}>
                      Renommer
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.chip, { borderColor: colors.border }]}
                    onPress={async () => {
                      setBusy(true);
                      await hideAdminTeam(team.id, !team.hidden);
                      setBusy(false);
                      await load();
                    }}
                  >
                    <Text style={{ color: colors.ink, fontFamily: typography.bodyMd.fontFamily }}>
                      {team.hidden ? 'Afficher' : 'Masquer'}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.chip, { borderColor: colors.accent }]}
                    onPress={() => onDissolve(team)}
                  >
                    <Text
                      style={{ color: colors.accent, fontFamily: typography.bodyMd.fontFamily }}
                    >
                      Dissoudre
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  name: { fontFamily: typography.bodyBold.fontFamily, fontSize: 16 },
  meta: { ...typography.caption, marginTop: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  renameBox: { gap: 8, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: typography.body.fontFamily,
  },
});
