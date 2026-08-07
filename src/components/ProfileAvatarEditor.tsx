import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import Animated, { SlideInDown } from 'react-native-reanimated';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Avatar, fonts, radii, spacing } from '../design-system';
import { pickAndPersistProfilePhoto } from '../lib/pickProfilePhoto';
import {
  PROFILE_PERSONAS,
  type ProfilePersonaId,
} from '../lib/profilePersonas';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function ProfileAvatarEditor({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const { user, updateProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const applyPersona = async (personaId: ProfilePersonaId) => {
    const persona = PROFILE_PERSONAS.find((p) => p.id === personaId);
    if (!persona) return;
    setBusy(true);
    try {
      await updateProfile({
        avatarPersonaId: personaId,
        avatarColor: persona.color,
        photo: undefined,
      });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const pickPhoto = async () => {
    setBusy(true);
    try {
      const result = await pickAndPersistProfilePhoto(user.id);
      if (!result.ok) {
        if (!result.cancelled && result.error) {
          Alert.alert('Photo', result.error);
        }
        return;
      }
      await updateProfile({
        photo: result.uri,
        avatarPersonaId: undefined,
      });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const clearCustom = async () => {
    setBusy(true);
    try {
      await updateProfile({
        photo: undefined,
        avatarPersonaId: undefined,
      });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
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
          <Text style={[styles.title, { color: colors.ink }]}>Ta photo ou avatar</Text>
          <Text style={[styles.sub, { color: colors.inkMuted }]}>
            Choisis une photo depuis ta bibliothèque, ou un avatar Jumelo.
          </Text>

          <View style={styles.preview}>
            <Avatar
              name={user.name}
              photo={user.photo}
              personaId={user.avatarPersonaId}
              color={user.avatarColor}
              size={88}
            />
          </View>

          <Pressable
            style={[
              styles.photoBtn,
              { backgroundColor: colors.primary },
            ]}
            onPress={pickPhoto}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Choisir une photo depuis la bibliothèque"
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="images-outline" size={20} color="#fff" />
                <Text style={styles.photoBtnText}>Photo depuis la bibliothèque</Text>
              </>
            )}
          </Pressable>

          <Text style={[styles.section, { color: colors.ink }]}>Avatars Jumelo</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.personaRow}
          >
            {PROFILE_PERSONAS.map((persona) => {
              const selected = user.avatarPersonaId === persona.id && !user.photo;
              return (
                <Pressable
                  key={persona.id}
                  onPress={() => applyPersona(persona.id)}
                  disabled={busy}
                  style={[
                    styles.personaCard,
                    {
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: colors.white,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Avatar ${persona.label}`}
                  accessibilityState={{ selected }}
                >
                  <Avatar
                    name={persona.label}
                    personaId={persona.id}
                    color={persona.color}
                    size={56}
                  />
                  <Text style={[styles.personaLabel, { color: colors.ink }]}>
                    {persona.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {(user.photo || user.avatarPersonaId) ? (
            <Pressable onPress={clearCustom} disabled={busy} style={styles.reset}>
              <Text style={{ fontFamily: fonts.bodyMedium, color: colors.inkMuted }}>
                Revenir aux initiales
              </Text>
            </Pressable>
          ) : null}

          <Pressable onPress={onClose} disabled={busy} style={styles.cancel}>
            <Text style={{ fontFamily: fonts.bodyBold, color: colors.primary }}>Fermer</Text>
          </Pressable>
        </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  },
  preview: { alignItems: 'center', marginBottom: spacing.md },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: radii.pill,
    paddingVertical: 14,
    marginBottom: spacing.lg,
  },
  photoBtnText: {
    color: '#fff',
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  section: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    marginBottom: spacing.sm,
  },
  personaRow: { gap: spacing.sm, paddingBottom: spacing.sm },
  personaCard: {
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderRadius: radii.md,
    padding: spacing.sm,
    minWidth: 84,
  },
  personaLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  reset: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  cancel: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
});
