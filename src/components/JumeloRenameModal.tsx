import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../context/ThemeContext';
import { Button, TextField, fonts, spacing } from '../design-system';

const NAME_MAX = 40;

type Props = {
  visible: boolean;
  currentName: string;
  onClose: () => void;
  onSave: (name: string) => Promise<{ ok: true } | { ok: false; error: string }>;
};

export function JumeloRenameModal({
  visible,
  currentName,
  onClose,
  onSave,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState(currentName);
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setValue(currentName);
      setError(undefined);
      setBusy(false);
    }
  }, [visible, currentName]);

  const handleSave = async () => {
    const trimmed = value.trim().replace(/\s+/g, ' ');
    if (!trimmed) {
      setError('Donne un nom à ton jumelo.');
      return;
    }
    if (trimmed.length < 2) {
      setError('Au moins 2 caractères.');
      return;
    }
    if (trimmed.length > NAME_MAX) {
      setError(`Maximum ${NAME_MAX} caractères.`);
      return;
    }
    if (trimmed === currentName.trim()) {
      onClose();
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const result = await onSave(trimmed);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onClose();
    } catch {
      setError('Impossible d’enregistrer. Réessaie.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={busy ? undefined : onClose}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={busy ? undefined : onClose}>
          <Pressable
            style={[
              styles.sheet,
              {
                backgroundColor: colors.cream,
                paddingBottom: Math.max(insets.bottom, spacing.lg),
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.handleRow}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
            </View>
            <Text style={[styles.title, { color: colors.ink }]}>
              Renommer le jumelo
            </Text>
            <Text style={[styles.sub, { color: colors.inkMuted }]}>
              Ce nom est partagé — il apparaît identiquement sur vos deux profils.
            </Text>

            <TextField
              label="Nom du jumelo"
              value={value}
              onChangeText={(text) => {
                setValue(text);
                if (error) setError(undefined);
              }}
              placeholder="Ex. Les Inséparables"
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={NAME_MAX}
              editable={!busy}
              error={error}
              hint={`${value.trim().length}/${NAME_MAX}`}
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />

            <Button
              label="Enregistrer"
              onPress={handleSave}
              loading={busy}
              disabled={busy}
              style={styles.save}
            />

            <Pressable onPress={onClose} disabled={busy} style={styles.cancel}>
              <Text style={{ fontFamily: fonts.bodyBold, color: colors.primary }}>
                Annuler
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(20,28,36,0.45)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  handleRow: { alignItems: 'center', marginBottom: spacing.sm },
  handle: { width: 40, height: 4, borderRadius: 2 },
  title: {
    fontFamily: fonts.displaySemi,
    fontSize: 22,
    letterSpacing: -0.3,
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 14,
    marginTop: 4,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  save: { marginTop: spacing.xs },
  cancel: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
});
