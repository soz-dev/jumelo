import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { safeBack } from '../../src/lib/navigation';
import { Button, Chip } from '../../src/components/ui';
import { platforms } from '../../src/constants/catalog';
import { fonts, radii, spacing } from '../../src/constants/theme';
import { useTheme } from '../../src/context/ThemeContext';
import { mockUsers } from '../../src/data/mock';
import type { PlatformId } from '../../src/constants/catalog';

export default function InviteScreen() {
  const { colors } = useTheme();
  const { userId, activity } = useLocalSearchParams<{ userId: string; activity?: string }>();
  const peer = mockUsers.find((u) => u.id === userId);
  const [platform, setPlatform] = useState<PlatformId>('pc');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');

  const gamePlatforms = platforms.filter((p) =>
    ['pc', 'psn', 'xbox', 'switch', 'mobile', 'discord'].includes(p.id),
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.cream }]}>
      <View style={[styles.sheet, { backgroundColor: colors.white }]}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        <View style={styles.header}>
          <View style={[styles.icon, { backgroundColor: colors.primary }]}>
            <Ionicons name="game-controller" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.ink }]}>Inviter à jouer</Text>
            <Text style={{ color: colors.inkMuted, fontFamily: fonts.body }}>
              avec {peer?.name ?? 'ce joueur'} · {activity ?? 'session'}
            </Text>
          </View>
          <Pressable onPress={() => safeBack('/(tabs)/discover')}>
            <Ionicons name="close" size={22} color={colors.inkMuted} />
          </Pressable>
        </View>

        <Text style={[styles.label, { color: colors.ink }]}>Plateforme</Text>
        <View style={styles.wrap}>
          {gamePlatforms.map((item) => (
            <Chip
              key={item.id}
              name={item.id}
              label={item.label}
              selected={platform === item.id}
              onPress={() => setPlatform(item.id)}
            />
          ))}
        </View>

        <Text style={[styles.label, { color: colors.ink }]}>Code / ID de salle</Text>
        <TextInput
          value={code}
          onChangeText={setCode}
          placeholder="ex: 4F2A-K9 · code d'invitation partie"
          placeholderTextColor={colors.inkFaint}
          style={[styles.input, { borderColor: colors.border, color: colors.ink }]}
        />

        <Text style={[styles.label, { color: colors.ink }]}>Message (optionnel)</Text>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="ex: On lance en ranked, mets ton casque 🎧"
          placeholderTextColor={colors.inkFaint}
          style={[styles.input, { borderColor: colors.border, color: colors.ink }]}
        />

        <Button
          label="Envoyer l'invitation"
          icon="send"
          onPress={() => {
            Alert.alert(
              'Invitation envoyée',
              `${peer?.name ?? 'Le joueur'} recevra le code (${platform.toUpperCase()}${code ? ` · ${code}` : ''}).`,
            );
            safeBack('/(tabs)/discover');
          }}
          style={{ marginTop: spacing.lg }}
        />
        <Text style={[styles.hint, { color: colors.inkFaint }]}>
          {peer?.name ?? 'Le joueur'} recevra le code et pourra rejoindre la partie
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: spacing.md,
  },
  header: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: fonts.displaySemi, fontSize: 20 },
  label: { fontFamily: fonts.bodyBold, marginTop: spacing.lg, marginBottom: spacing.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  input: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontFamily: fonts.body,
  },
  hint: {
    textAlign: 'center',
    marginTop: spacing.md,
    fontFamily: fonts.body,
    fontSize: 13,
  },
});
