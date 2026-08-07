import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActivityArtImage } from '../../src/components/ActivityArtImage';
import { GameArtImage } from '../../src/components/GameArtImage';
import { categories, findInterestInCatalog } from '../../src/constants/catalog';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { mockUsers, type UserProfile } from '../../src/data/mock';
import { elevation, fonts, radii, spacing, withHexAlpha } from '../../src/design-system';
import { getProfileById } from '../../src/lib/api/profiles';

/** Résout subCategoryIds + interests (labels) en un Set d'IDs catalogue. */
function resolveSubIds(profile: UserProfile): Set<string> {
  const ids = new Set<string>(profile.subCategoryIds ?? []);
  for (const interest of profile.interests ?? []) {
    const match = findInterestInCatalog(interest);
    if (match) ids.add(match.id);
  }
  return ids;
}

type SubTile = { id: string; label: string; color: string; isGaming: boolean };

export default function ChooseSubScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { peerId, conversationId } = useLocalSearchParams<{
    peerId: string;
    conversationId?: string;
  }>();

  const [peer, setPeer] = useState<UserProfile | null | undefined>(undefined);

  useEffect(() => {
    if (!peerId) { setPeer(null); return; }
    const local = mockUsers.find((u) => u.id === peerId);
    if (local) { setPeer(local); return; }
    getProfileById(peerId)
      .then((p) => setPeer(p ?? null))
      .catch(() => setPeer(null));
  }, [peerId]);

  const commonSubs = useMemo<SubTile[]>(() => {
    if (!user || !peer) return [];
    const mySubIds = resolveSubIds(user);
    const peerSubIds = resolveSubIds(peer);
    const result: SubTile[] = [];
    for (const cat of categories) {
      for (const sub of cat.subCategories) {
        if (mySubIds.has(sub.id) && peerSubIds.has(sub.id)) {
          result.push({
            id: sub.id,
            label: sub.label,
            color: cat.color,
            isGaming: cat.id === 'gaming',
          });
        }
      }
    }
    return result;
  }, [user, peer]);

  const openChat = (_subId?: string) => {
    if (conversationId) {
      router.replace(`/chat/${conversationId}`);
    } else {
      router.back();
    }
  };

  if (peer === undefined) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.cream }]}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.cream }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={20} color={colors.ink} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.ink }]}>Votre jumelo est formé 🎉</Text>
          <Text style={[styles.subtitle, { color: colors.inkMuted }]}>
            Choisissez votre activité commune
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.eyebrow, { color: colors.inkMuted }]}>
          Sous-catégories en commun avec {peer?.name ?? 'votre jumelo'}
        </Text>

        {commonSubs.length === 0 ? (
          <View style={styles.emptyBlock}>
            <Text style={{ fontSize: 40 }}>🤝</Text>
            <Text style={[styles.emptyText, { color: colors.inkMuted }]}>
              Aucune sous-catégorie en commun trouvée.{'\n'}Commencez à discuter pour en choisir une ensemble.
            </Text>
            <Pressable
              style={[styles.chatBtn, { backgroundColor: colors.primary }]}
              onPress={openChat}
            >
              <Text style={styles.chatBtnText}>Commencer à discuter</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.grid}>
              {commonSubs.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => openChat(item.id)}
                  style={[styles.tile, elevation.soft, { borderColor: withHexAlpha(item.color, 0.28) }]}
                  accessibilityLabel={item.label}
                >
                  <View style={[styles.tileArt, { backgroundColor: withHexAlpha(item.color, 0.08) }]}>
                    {item.isGaming ? (
                      <GameArtImage
                        catalogId={item.id}
                        size={TILE_W}
                        height={TILE_ART_H}
                        color={item.color}
                        brandedFallback
                        borderRadius={0}
                      />
                    ) : (
                      <ActivityArtImage
                        catalogId={item.id}
                        size={TILE_ICON_SIZE}
                        color={item.color}
                        backgroundColor="transparent"
                      />
                    )}
                  </View>
                  <View style={[styles.tileFoot, { backgroundColor: colors.white }]}>
                    <Text style={[styles.tileLabel, { color: colors.ink }]} numberOfLines={1}>
                      {item.label}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>

            <Pressable style={styles.skipRow} onPress={() => openChat()}>
              <Text style={[styles.skipText, { color: colors.inkMuted }]}>
                Passer cette étape →
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const TILE_W = Math.floor((Dimensions.get('window').width - spacing.lg * 2 - spacing.sm) / 2);
const TILE_ART_H = Math.round(TILE_W * 0.75);
const TILE_ICON_SIZE = Math.round(TILE_W * 0.55);

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  title: { fontFamily: fonts.display, fontSize: 20, letterSpacing: -0.3 },
  subtitle: { fontFamily: fonts.body, fontSize: 13, marginTop: 2 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  eyebrow: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tile: {
    width: TILE_W,
    borderRadius: radii.xl,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  tileArt: {
    width: TILE_W,
    height: TILE_ART_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileFoot: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
  },
  tileLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    textAlign: 'center',
  },
  emptyBlock: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  chatBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    borderRadius: radii.lg,
    marginTop: spacing.sm,
  },
  chatBtnText: { fontFamily: fonts.bodyBold, fontSize: 15, color: '#fff' },
  skipRow: { alignItems: 'center', marginTop: spacing.lg },
  skipText: { fontFamily: fonts.body, fontSize: 14 },
});
