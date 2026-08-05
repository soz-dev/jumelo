import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  SettingsBackHeader,
  SettingsSectionLabel,
} from '../../src/components/SettingsChrome';
import { Screen, spacing, typography } from '../../src/design-system';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { getCurrentFirebaseUid } from '../../src/lib/admin';
import {
  addModerator,
  listModerators,
  removeModerator,
  setModeratorPermission,
  type Moderator,
  type ModeratorPermissions,
} from '../../src/lib/adminModerators';

const PERM_LABELS: { key: keyof ModeratorPermissions; label: string; hint: string }[] = [
  { key: 'canRenameTeam',  label: 'Renommer un jumelo',        hint: "Modifier le nom d'un groupe" },
  { key: 'canRemovePhoto', label: 'Retirer une photo',         hint: "Supprimer l'avatar d'un joueur" },
  { key: 'canSendWarning', label: 'Envoyer un avertissement',  hint: 'Message via Jumelo-Modération' },
];

export default function AdminModeratorsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [mods, setMods] = useState<Moderator[]>([]);
  const [uidInput, setUidInput] = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setMods(await listModerators());
  }, []);

  useFocusEffect(useCallback(() => { load().catch(() => undefined); }, [load]));

  const onAdd = async () => {
    const adminUid = getCurrentFirebaseUid() ?? user?.id ?? 'admin';
    setBusy(true);
    const res = await addModerator(uidInput, adminUid, labelInput);
    setBusy(false);
    if (!res.ok) {
      Alert.alert('Erreur', res.error ?? 'Impossible d'ajouter.');
      return;
    }
    setUidInput('');
    setLabelInput('');
    await load();
  };

  const onRemove = (mod: Moderator) => {
    Alert.alert(
      'Retirer le modérateur ?',
      `UID : ${mod.uid}`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: async () => { await removeModerator(mod.uid); await load(); },
        },
      ],
    );
  };

  const onTogglePerm = async (
    mod: Moderator,
    perm: keyof ModeratorPermissions,
    value: boolean,
  ) => {
    await setModeratorPermission(mod.uid, perm, value);
    await load();
  };

  return (
    <Screen>
      <SettingsBackHeader
        title="Modérateurs"
        subtitle="Droits de modération"
        fallback="/admin"
      />
      <ScrollView contentContainerStyle={styles.content}>

        {/* ─── Add form ─── */}
        <SettingsSectionLabel label="Ajouter un modérateur" />
        <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.border }]}>
          <TextInput
            value={uidInput}
            onChangeText={setUidInput}
            placeholder="UID Firebase (ex. 4acsLCU0qN…)"
            placeholderTextColor={colors.inkFaint}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, { color: colors.ink, borderColor: colors.border }]}
          />
          <TextInput
            value={labelInput}
            onChangeText={setLabelInput}
            placeholder="Surnom (optionnel)"
            placeholderTextColor={colors.inkFaint}
            style={[styles.input, { color: colors.ink, borderColor: colors.border }]}
          />
          <TouchableOpacity
            onPress={onAdd}
            disabled={busy || !uidInput.trim()}
            style={[
              styles.addBtn,
              { backgroundColor: uidInput.trim() ? colors.primary : colors.border },
            ]}
          >
            <Text style={styles.addBtnText}>
              {busy ? 'Ajout…' : 'Ajouter'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ─── Moderator list ─── */}
        <SettingsSectionLabel label={`Modérateurs actifs (${mods.length})`} />

        {mods.length === 0 ? (
          <Text style={[styles.empty, { color: colors.inkFaint }]}>
            Aucun modérateur pour l'instant.
          </Text>
        ) : (
          mods.map((mod) => (
            <View
              key={mod.uid}
              style={[styles.card, { backgroundColor: colors.white, borderColor: colors.border }]}
            >
              {/* UID + label + remove */}
              <View style={styles.modHeader}>
                <View style={[styles.modIcon, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="shield-checkmark" size={18} color={colors.primaryDark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modUid, { color: colors.ink }]} numberOfLines={1}>
                    {mod.label ?? 'Modérateur'}
                  </Text>
                  <Text style={[styles.modSub, { color: colors.inkFaint }]} numberOfLines={1}>
                    {mod.uid}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => onRemove(mod)}
                  style={[styles.removeBtn, { borderColor: colors.accent }]}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.accent} />
                </TouchableOpacity>
              </View>

              {/* Permission toggles */}
              <View style={[styles.permDivider, { borderColor: colors.border }]} />
              {PERM_LABELS.map(({ key, label, hint }) => (
                <View key={key} style={styles.permRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.permLabel, { color: colors.ink }]}>{label}</Text>
                    <Text style={[styles.permHint,  { color: colors.inkFaint }]}>{hint}</Text>
                  </View>
                  <Switch
                    value={mod.permissions[key]}
                    onValueChange={(v) => onTogglePerm(mod, key, v)}
                    trackColor={{ false: colors.border, true: colors.primarySoft }}
                    thumbColor={mod.permissions[key] ? colors.primary : colors.inkFaint}
                  />
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content:    { paddingHorizontal: spacing.lg, paddingBottom: 60 },
  card:       { borderWidth: 1, borderRadius: 16, padding: spacing.md, marginBottom: spacing.sm, gap: 10 },
  input:      { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontFamily: typography.body.fontFamily, fontSize: 14 },
  addBtn:     { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  addBtnText: { fontFamily: typography.bodyBold.fontFamily, fontSize: 14, color: '#fff' },
  empty:      { fontFamily: typography.body.fontFamily, fontSize: 14, textAlign: 'center', marginTop: 24 },
  modHeader:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modIcon:    { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modUid:     { fontFamily: typography.bodyBold.fontFamily, fontSize: 14 },
  modSub:     { fontFamily: typography.body.fontFamily, fontSize: 12, marginTop: 1 },
  removeBtn:  { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  permDivider:{ borderTopWidth: StyleSheet.hairlineWidth, marginTop: 2 },
  permRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 6 },
  permLabel:  { fontFamily: typography.bodyBold.fontFamily, fontSize: 13 },
  permHint:   { fontFamily: typography.body.fontFamily, fontSize: 11, marginTop: 1 },
});
