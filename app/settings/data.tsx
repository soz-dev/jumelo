import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../src/components/ui';
import {
  SettingsBackHeader,
  SettingsRow,
  SettingsSectionLabel,
} from '../../src/components/SettingsChrome';
import { fonts, radii, spacing } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { buildDataExport, deleteUserAccount } from '../../src/lib/api/account';

export default function DataRightsScreen() {
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const onExport = async () => {
    setExporting(true);
    try {
      const payload = await buildDataExport(user);
      const json = JSON.stringify(payload, null, 2);
      await Share.share({
        title: 'Export Jumelo',
        message: json,
      });
    } catch (e) {
      Alert.alert(
        'Export impossible',
        e instanceof Error ? e.message : 'Une erreur est survenue.',
      );
    } finally {
      setExporting(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Supprimer mon compte',
      'Cette action est irréversible. Ton profil, tes préférences locales et (si connecté à Supabase) tes données applicatives associées seront effacées. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer définitivement',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirmation finale',
              'Es-tu sûr·e de vouloir supprimer ton compte Jumelo ?',
              [
                { text: 'Non', style: 'cancel' },
                { text: 'Oui, supprimer', style: 'destructive', onPress: runDelete },
              ],
            );
          },
        },
      ],
    );
  };

  const runDelete = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      const result = await deleteUserAccount(user.id);
      if (!result.ok) {
        Alert.alert('Échec', result.error);
        return;
      }
      await logout();
      Alert.alert(
        'Compte supprimé',
        result.mode === 'local'
          ? 'Données locales effacées (mode démo).'
          : 'Profil serveur et données locales effacés. La purge complète de l’identité Auth peut nécessiter une étape serveur (voir LEGAL.md).',
      );
      router.replace('/(auth)/welcome');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.cream }]} edges={['top']}>
      <SettingsBackHeader title="Mes données" subtitle="Droits RGPD" fallback="/settings" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.lead, { color: colors.inkMuted }]}>
          Accès, portabilité et effacement : outils proposés dans l’app. Pour les autres droits
          (opposition, limitation), contacte le DPO indiqué dans la politique de confidentialité.
        </Text>

        <SettingsSectionLabel label="Actions" />
        <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.ink }]}>Exporter mes données</Text>
          <Text style={[styles.cardBody, { color: colors.inkMuted }]}>
            Génère un export JSON (profil + préférences + preuves de consentement) partageable
            depuis ton appareil.
          </Text>
          {exporting ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.sm }} />
          ) : (
            <Button label="Exporter (JSON)" onPress={onExport} style={{ marginTop: spacing.sm }} />
          )}
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.white, borderColor: colors.accentSoft },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.accent }]}>Supprimer mon compte</Text>
          <Text style={[styles.cardBody, { color: colors.inkMuted }]}>
            Double confirmation. Efface le stockage local Jumelo et, en mode cloud, le profil
            Supabase (cascade des relations).
          </Text>
          <Button
            label={deleting ? 'Suppression…' : 'Supprimer mon compte'}
            onPress={confirmDelete}
            variant="accent"
            loading={deleting}
            style={{ marginTop: spacing.sm }}
          />
        </View>

        <SettingsSectionLabel label="Documentation" />
        <SettingsRow
          icon="shield-checkmark-outline"
          label="Voir la politique de confidentialité"
          onPress={() => router.push('/settings/privacy')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  lead: { fontFamily: fonts.body, fontSize: 14, lineHeight: 22 },
  card: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardTitle: { fontFamily: fonts.bodyBold, fontSize: 16 },
  cardBody: { fontFamily: fonts.body, fontSize: 14, lineHeight: 22, marginTop: 6 },
});
