import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import { Icon, fonts, radii, spacing, withHexAlpha } from '../design-system';
import {
  getAchievementsForUser,
  type AchievementProgress,
} from '../lib/achievements';

type Props = {
  userId: string;
  reliability?: number;
};

function AchievementTile({ item }: { item: AchievementProgress }) {
  const { colors } = useTheme();
  const locked = !item.unlocked;

  return (
    <View
      style={[
        styles.tile,
        {
          backgroundColor: locked
            ? withHexAlpha(colors.primarySoft, 0.45)
            : withHexAlpha(colors.primarySoft, 0.9),
          borderColor: locked
            ? withHexAlpha(colors.border, 0.9)
            : withHexAlpha(colors.primary, 0.22),
          opacity: locked ? 0.72 : 1,
        },
      ]}
      accessibilityLabel={`${item.title}${locked ? ', verrouillé' : ', débloqué'}`}
    >
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: locked ? colors.border : colors.primarySoft,
          },
        ]}
      >
        <Icon
          name={locked ? 'lock' : item.icon}
          size={22}
          color={locked ? colors.inkMuted : colors.primary}
        />
      </View>
      <Text
        style={[styles.title, { color: colors.ink }]}
        numberOfLines={2}
      >
        {item.title}
      </Text>
      <Text
        style={[styles.desc, { color: colors.inkMuted }]}
        numberOfLines={2}
      >
        {item.description}
      </Text>
      {item.target > 1 ? (
        <View style={styles.progressBlock}>
          <View
            style={[styles.track, { backgroundColor: colors.border }]}
          >
            <View
              style={[
                styles.fill,
                {
                  backgroundColor: locked ? colors.inkFaint : colors.primary,
                  width: `${Math.round(item.progress * 100)}%`,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: colors.inkFaint }]}>
            {item.current}/{item.target}
          </Text>
        </View>
      ) : (
        <Text style={[styles.progressText, { color: colors.inkFaint }]}>
          {item.unlocked ? 'Débloqué' : 'À débloquer'}
        </Text>
      )}
    </View>
  );
}

export function AchievementsSection({ userId, reliability = 80 }: Props) {
  const { colors } = useTheme();
  const [items, setItems] = useState<AchievementProgress[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getAchievementsForUser(userId, reliability).then((list) => {
        if (active) setItems(list);
      });
      return () => {
        active = false;
      };
    }, [userId, reliability]),
  );

  if (items.length === 0) return null;

  const unlockedCount = items.filter((i) => i.unlocked).length;

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: colors.ink }]}>Succès</Text>
        <Text style={[styles.count, { color: colors.inkMuted }]}>
          {unlockedCount}/{items.length}
        </Text>
      </View>
      <View style={styles.grid}>
        {items.map((item) => (
          <AchievementTile key={item.id} item={item} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.xl },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fonts.displaySemi,
    fontSize: 20,
    letterSpacing: -0.3,
  },
  count: { fontFamily: fonts.bodyMedium, fontSize: 13 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tile: {
    width: '48%',
    flexGrow: 1,
    minWidth: '46%',
    maxWidth: '48%',
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 6,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  desc: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 16,
    minHeight: 32,
  },
  progressBlock: { marginTop: 4, gap: 4 },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: 4,
    borderRadius: 2,
  },
  progressText: {
    fontFamily: fonts.body,
    fontSize: 11,
  },
});
