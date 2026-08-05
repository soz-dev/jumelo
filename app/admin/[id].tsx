import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SettingsBackHeader } from '../../src/components/SettingsChrome';
import {
  Avatar,
  Button,
  Screen,
  TextField,
  spacing,
  typography,
} from '../../src/design-system';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import {
  SettingsToggleRow,
} from '../../src/components/SettingsChrome';
import {
  AVATAR_PRESETS,
  deleteAdminMember,
  getAdminMember,
  renameAdminMember,
  sendAdminMessage,
  setAdminMemberPhoto,
  setMemberBanState,
  warnAdminMember,
  type AdminMember,
} from '../../src/lib/adminStore';
import { safeBack } from '../../src/lib/navigation';
import { setUserPremium } from '../../src/lib/premiumStore';

export default function AdminMemberDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const [member, setMember] = useState<AdminMember | null>(null);
  const [name, setName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [message, setMessage] = useState('');
  const [warnMessage, setWarnMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    const m = await getAdminMember(id);
    setMember(m);
    if (m) {
      setName(m.name);
      setPhotoUrl(m.photo ?? '');
    }
  }, [id]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  if (!member) {
    return (
      <Screen>
        <SettingsBackHeader title="Membre" fallback="/admin/members" />
        <Text style={{ padding: spacing.lg, color: colors.inkMuted }}>Chargement…</Text>
      </Screen>
    );
  }

  const onRename = async () => {
    setBusy(true);
    setStatus('');
    const result = await renameAdminMember(member.id, name);
    setBusy(false);
    if (!result.ok) {
      setStatus(result.error);
      return;
    }
    setStatus('Nom mis à jour.');
    await load();
  };

  const onPhoto = async (url?: string) => {
    const next = (url ?? photoUrl).trim();
    setBusy(true);
    setStatus('');
    const result = await setAdminMemberPhoto(member.id, next);
    setBusy(false);
    if (!result.ok) {
      setStatus(result.error);
      return;
    }
    setPhotoUrl(next);
    setStatus('Image mise à jour.');
    await load();
  };

  const onSend = async () => {
    if (!user) return;
    setBusy(true);
    setStatus('');
    const result = await sendAdminMessage({
      fromUserId: user.id,
      peer: member,
      body: message,
    });
    setBusy(false);
    if (!result.ok) {
      setStatus(result.error);
      return;
    }
    setMessage('');
    setStatus('Message envoyé.');
    router.push(`/chat/${result.conversationId}`);
  };

  const onDelete = () => {
    Alert.alert(
      'Supprimer le membre ?',
      `${member.name} sera retiré de la liste admin (démo locale + best-effort cloud).`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            await deleteAdminMember(member.id);
            setBusy(false);
            safeBack('/admin/members');
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <SettingsBackHeader
        title={member.name}
        subtitle={member.email}
        fallback="/admin/members"
      />      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Avatar
            name={member.name}
            photo={member.photo}
            color={member.avatarColor}
            size={88}
          />
          <Text style={[styles.meta, { color: colors.inkMuted }]}>
            {member.source} · {member.id}
          </Text>
        </View>

        {status ? (
          <Text style={[styles.status, { color: colors.primary }]}>{status}</Text>
        ) : null}

        <Text style={[styles.section, { color: colors.ink }]}>Renommer</Text>
        <TextField label="Nom affiché" value={name} onChangeText={setName} />
        <Button label="Enregistrer le nom" onPress={onRename} loading={busy} />

        <Text style={[styles.section, { color: colors.ink }]}>Image de profil</Text>
        <TextField
          label="URL avatar"
          value={photoUrl}
          onChangeText={setPhotoUrl}
          autoCapitalize="none"
          placeholder="https://…"
        />
        <Button
          label="Appliquer l’URL"
          onPress={() => onPhoto()}
          variant="secondary"
          loading={busy}
        />
        <Text style={[styles.hint, { color: colors.inkFaint }]}>
          Ou choisir un preset (stub upload) :
        </Text>
        <View style={styles.presets}>
          {AVATAR_PRESETS.map((uri) => (
            <Pressable
              key={uri}
              onPress={() => onPhoto(uri)}
              style={[styles.preset, { borderColor: colors.border }]}
            >
              <Avatar name="P" photo={uri} size={48} />
            </Pressable>
          ))}
        </View>

        <Text style={[styles.section, { color: colors.ink }]}>Premium</Text>
        <SettingsToggleRow
          icon="diamond-outline"
          label="Premium"
          hint={
            member.isPremium
              ? 'Accès Premium actif pour ce membre'
              : 'Membre sans Premium (bloqué si paywall ON)'
          }
          value={Boolean(member.isPremium)}
          onValueChange={async (v) => {
            setBusy(true);
            await setUserPremium(member.id, v, { actorLabel: `membre ${member.name}` });
            setBusy(false);
            setStatus(v ? 'Premium accordé.' : 'Premium retiré.');
            await load();
          }}
        />

        <Text style={[styles.section, { color: colors.ink }]}>Modération</Text>
        <Text style={[styles.hint, { color: colors.inkMuted }]}>
          {member.banned
            ? 'Compte banni'
            : member.suspended
              ? 'Compte suspendu'
              : 'Compte actif'}
          {member.warnCount ? ` · ${member.warnCount} avertissement(s)` : ''}
        </Text>
        <View style={styles.modRow}>
          <Button
            label={member.suspended ? 'Lever suspension' : 'Suspendre'}
            variant="secondary"
            loading={busy}
            onPress={async () => {
              setBusy(true);
              await setMemberBanState(member.id, { suspended: !member.suspended });
              setBusy(false);
              setStatus(member.suspended ? 'Suspension levée.' : 'Compte suspendu.');
              await load();
            }}
          />
          <Button
            label={member.banned ? 'Débannir' : 'Bannir'}
            variant="accent"
            loading={busy}
            onPress={async () => {
              setBusy(true);
              await setMemberBanState(member.id, {
                banned: !member.banned,
                reason: 'Modération admin',
              });
              setBusy(false);
              setStatus(member.banned ? 'Ban levé.' : 'Compte banni.');
              await load();
            }}
          />
        </View>
        <Text style={[styles.section, { color: colors.ink }]}>Avertissement</Text>
        <Text style={[styles.hint, { color: colors.inkMuted }]}>
          Le message s’affiche une fois en pop-in au démarrage de l’app pour ce membre, et reste
          visible ici dans l’historique admin.
        </Text>
        <TextField
          label="Message d’avertissement"
          value={warnMessage}
          onChangeText={setWarnMessage}
          multiline
          numberOfLines={3}
          placeholder="Ex. : Merci de respecter la charte communauté…"
          style={{ minHeight: 80, textAlignVertical: 'top' }}
        />
        <Button
          label="Envoyer l’avertissement"
          icon="warning-outline"
          variant="secondary"
          loading={busy}
          disabled={!warnMessage.trim()}
          onPress={async () => {
            setBusy(true);
            const result = await warnAdminMember(member.id, warnMessage);
            setBusy(false);
            if (!result.ok) {
              setStatus(result.error);
              return;
            }
            setWarnMessage('');
            setStatus(`Avertissement #${result.count} enregistré — pop-in au prochain démarrage.`);
            await load();
          }}
          style={{ marginTop: spacing.sm }}
        />

        {(member.warnings?.length ?? 0) > 0 ? (
          <View style={styles.warnHistory}>
            <Text style={[styles.historyTitle, { color: colors.ink }]}>
              Historique ({member.warnings!.length})
            </Text>
            {member.warnings!.map((w) => (
              <View
                key={w.id}
                style={[
                  styles.warnCard,
                  {
                    backgroundColor: colors.cream,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.warnMsg, { color: colors.ink }]}>{w.message}</Text>
                <Text style={[styles.hint, { color: colors.inkFaint, marginTop: 4 }]}>
                  {new Date(w.createdAt).toLocaleString('fr-FR')}
                  {w.acknowledgedAt
                    ? ` · vu le ${new Date(w.acknowledgedAt).toLocaleString('fr-FR')}`
                    : ' · en attente (pop-in)'}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[styles.hint, { color: colors.inkFaint }]}>
            Aucun avertissement pour ce membre.
          </Text>
        )}

        <Text style={[styles.section, { color: colors.ink }]}>Message au membre</Text>
        <TextField
          label="Contenu"
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={3}
          placeholder="Notice admin ou message DM…"
          style={{ minHeight: 80, textAlignVertical: 'top' }}
        />
        <Button
          label="Envoyer"
          icon="send"
          onPress={onSend}
          variant="accent"
          loading={busy}
          disabled={!message.trim()}
        />

        <View style={{ height: spacing.xl }} />
        <Button
          label="Supprimer le membre"
          onPress={onDelete}
          variant="ghost"
          icon="trash-outline"
          disabled={busy}
          style={{ borderWidth: 1, borderColor: colors.accent }}
        />
        <View style={styles.warnRow}>
          <Ionicons name="warning-outline" size={16} color={colors.inkFaint} />
          <Text style={[styles.hint, { color: colors.inkFaint, flex: 1 }]}>
            En démo, la suppression est locale. Sur Supabase, le delete peut être bloqué par RLS.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  hero: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  meta: { ...typography.caption },
  section: {
    ...typography.section,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  status: {
    ...typography.bodyMd,
    marginBottom: spacing.sm,
  },
  hint: {
    ...typography.caption,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: spacing.md,
  },
  preset: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 2,
  },
  warnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.md,
    alignItems: 'flex-start',
  },
  modRow: { gap: spacing.sm },
  warnHistory: { marginTop: spacing.md, gap: spacing.sm },
  historyTitle: { ...typography.section, marginBottom: spacing.xs },
  warnCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.md,
  },
  warnMsg: { ...typography.body, lineHeight: 21 },
});
