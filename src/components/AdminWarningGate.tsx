import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button, radii, spacing, typography } from '../design-system';
import {
  acknowledgeUserWarning,
  getPendingUserWarning,
  type AdminWarning,
} from '../lib/adminStore';

/**
 * Affiche une seule fois au démarrage (session connectée) le prochain
 * avertissement admin non encore acquitté.
 */
export function AdminWarningGate() {
  const { user, loading } = useAuth();
  const { colors } = useTheme();
  const [warning, setWarning] = useState<AdminWarning | null>(null);
  const [visible, setVisible] = useState(false);

  const load = useCallback(async () => {
    if (loading || !user?.id) {
      setWarning(null);
      setVisible(false);
      return;
    }
    const pending = await getPendingUserWarning(user.id);
    setWarning(pending);
    setVisible(Boolean(pending));
  }, [loading, user?.id]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const onDismiss = async () => {
    if (!user?.id || !warning) {
      setVisible(false);
      return;
    }
    await acknowledgeUserWarning(user.id, warning.id);
    setVisible(false);
    setWarning(null);
  };

  if (!warning) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable
        style={[styles.backdrop, { backgroundColor: 'rgba(20, 28, 36, 0.55)' }]}
        onPress={onDismiss}
      >
        <Pressable
          style={[
            styles.card,
            { backgroundColor: colors.cream, borderColor: colors.warning },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.iconWrap, { backgroundColor: `${colors.warning}22` }]}>
            <Ionicons name="warning" size={28} color={colors.warning} />
          </View>
          <Text style={[styles.title, { color: colors.ink }]}>Avertissement</Text>
          <Text style={[styles.body, { color: colors.inkMuted }]}>{warning.message}</Text>
          <Text style={[styles.meta, { color: colors.inkFaint }]}>
            {new Date(warning.createdAt).toLocaleString('fr-FR')}
          </Text>
          <Button label="J’ai compris" onPress={onDismiss} variant="accent" />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: radii.xl,
    borderWidth: 1.5,
    padding: spacing.xl,
    gap: spacing.md,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  title: {
    ...typography.titleSm,
    textAlign: 'center',
  },
  body: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 22,
  },
  meta: {
    ...typography.caption,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
});
