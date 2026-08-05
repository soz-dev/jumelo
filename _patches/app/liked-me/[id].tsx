import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Atmosphere } from '../../src/components/Atmosphere';
import { Button } from '../../src/components/ui';
import { fonts, radii, spacing } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { markIncomingLikeRead } from '../../src/lib/api/likes';
import { safeBack } from '../../src/lib/navigation';
import { resolveUserById } from '../../src/lib/users';

/**
 * Ancien écran « X veut jumeler » (likes Discover).
 * Redirige vers le flux produit actuel : Jumelo du jour.
 */
export default function LikedMeScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: me } = useAuth();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (me?.id && id) {
        await markIncomingLikeRead(me.id, id).catch(() => undefined);
      }
      if (!id) {
        if (active) setName(null);
        return;
      }
      const peer = await resolveUserById(id);
      if (active) setName(peer?.name?.split(' ')[0] ?? 'Quelqu’un');
    })();
    return () => {
      active = false;
    };
  }, [id, me?.id]);

  if (!me) return null;

  if (name === null && id) {
    return (
      <Atmosphere>
        <SafeAreaView style={styles.safe}>
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        </SafeAreaView>
      </Atmosphere>
    );
  }

  const label = name ?? 'Quelqu’un';

  return (
    <Atmosphere>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Pressable
          onPress={() => safeBack('/(tabs)/home')}
          style={[styles.close, { backgroundColor: colors.white, borderColor: colors.border }]}
          accessibilityLabel="Fermer"
        >
          <Ionicons name="close" size={22} color={colors.ink} />
        </Pressable>

        <View style={styles.body}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="compass" size={36} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.ink }]}>
            {label} t’attend sur le Jumelo du jour
          </Text>
          <Text style={[styles.copy, { color: colors.inkMuted }]}>
            Plus d’invites Discover à part. Chaque jour, l’algo propose un binôme :
            tu acceptes ou tu refuses. Si c’est mutuel, vous discutez 72 h pour former
            le jumelo.
          </Text>
          <Button
            label="Ouvrir Jumelo du jour"
            icon="compass-outline"
            onPress={() => router.replace('/(tabs)/discover')}
          />
          <Button
            label="Retour"
            variant="ghost"
            onPress={() => safeBack('/(tabs)/home')}
            style={{ marginTop: spacing.sm }}
          />
        </View>
      </SafeAreaView>
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  close: {
    alignSelf: 'flex-end',
    marginTop: spacing.sm,
    marginRight: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 26,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  copy: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
});
