import { useEffect, useState } from 'react';
import Animated, { SlideInDown } from 'react-native-reanimated';
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
import { isProvisionalJumeloName } from '../lib/jumeloName';

const NAME_MAX = 40;

type Props = {
  visible: boolean;
  currentName: string;
  /** `name` = premier choix post-formation ; `rename` = édition ultérieure. */
  variant?: 'name' | 'rename';
  onClose: () => void;
  onSave: (name: string) => Promise<{ ok: true } | { ok: false; error: string }>;
};

export function JumeloRenameModal({
  visible,
  currentName,
  variant = 'rename',
  onClose,
  onSave,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState(currentName);
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const isFirstName = variant === 'name';

  useEffect(() => {
    if (visible) {
      // Premier naming : champ vide, l’auto-nom sert de placeholder.
      setValue(isFirstName && isProvisionalJumeloName(currentName) ? '' : currentName);
      setError(undefined);
      setBusy(false);
    }
  }, [visible, currentName, isFirstName]);

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
    if (isFirstName && isProvisionalJumeloName(trimmed)) {
      setError('Choisis un vrai nom pour votre jumelo.');
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
      animationType="none"
      transparent
      onRequestClose={busy ? undefined : onClose}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={busy ? undefined : onClose}>
          <Animated.View entering={SlideInDown.springify().damping(80).stiffness(250)} style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
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
              {isFirstName ? 'Nomme ton jumelo' : 'Renommer le jumelo'}
            </Text>
            <Text style={[styles.sub, { color: colors.inkMuted }]}>
              {isFirstName
                ? 'Choisis un nom pour ce nouveau jumelo — partagé avec ton binôme.'
                : 'Ce nom est partagé — il apparaît identiquement sur vos deux profils.'}
            </Text>

            <TextField
              label="Nom du jumelo"
              value={value}
              onChangeText={(text) => {
                setValue(text);
                if (error) setError(undefined);
              }}
              placeholder={
                isFirstName && currentName.trim()
                  ? currentName.trim()
                  : 'Ex. Les Inséparables'
              }
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
              label={isFirstName ? 'Confirmer' : 'Enregistrer'}
              onPress={handleSave}
              loading={busy}
              disabled={busy}
              style={styles.save}
            />

            <Pressable onPress={onClose} disabled={busy} style={styles.cancel}>
              <Text style={{ fontFamily: fonts.bodyBold, color: colors.primary }}>
                {isFirstName ? 'Plus tard' : 'Annuler'}
              </Text>
            </Pressable>
          </Pressable>
          </Animated.View>
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
