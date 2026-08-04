import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Chip } from './ui';
import {
  Category,
  PlatformId,
  SubCategory,
  UniverseId,
  categories,
  getCategory,
  getSubCategory,
} from '../constants/catalog';
import { fonts, radii, spacing } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { Icon, resolveCatalogIcon, universeIcon } from '../design-system';

export type CategoryPath = {
  universeId: UniverseId | null;
  subCategoryId: string | null;
  platformId: PlatformId | null;
};

type Props = {
  value: CategoryPath;
  onChange: (next: CategoryPath) => void;
  /** Si true, force le drill-down jusqu'à la plateforme quand disponible */
  requirePlatform?: boolean;
};

function tileAccent(universeId: UniverseId | undefined, index: number): string {
  const palette =
    universeId === 'gaming'
      ? ['#0F8F8A', '#3D7EA6', '#FF5A45', '#F5A623', '#5B8DEF', '#00C2A8']
      : universeId === 'sports'
        ? ['#0F8F8A', '#27AE60', '#16A085', '#F39C12']
        : ['#0F8F8A', '#3D7EA6', '#C45C26', '#6B5B95'];
  return palette[index % palette.length];
}

export function CategoryPicker({ value, onChange, requirePlatform }: Props) {
  const { colors } = useTheme();
  const category: Category | undefined = value.universeId
    ? getCategory(value.universeId)
    : undefined;
  const sub: SubCategory | undefined =
    value.universeId && value.subCategoryId
      ? getSubCategory(value.universeId, value.subCategoryId)
      : undefined;

  const isGamingGrid = value.universeId === 'gaming';

  return (
    <View style={styles.wrap}>
      <View style={styles.crumbs}>
        <Pressable
          onPress={() =>
            onChange({ universeId: null, subCategoryId: null, platformId: null })
          }
        >
          <Text style={[styles.crumb, { color: colors.primary }]}>Catégories</Text>
        </Pressable>
        {category ? (
          <>
            <Text style={{ color: colors.inkFaint }}> › </Text>
            <Pressable
              onPress={() =>
                onChange({
                  universeId: category.id,
                  subCategoryId: null,
                  platformId: null,
                })
              }
              style={styles.crumbRow}
            >
              <Icon
                name={universeIcon(category.id)}
                size={14}
                color={colors.primary}
                weight="bold"
              />
              <Text style={[styles.crumb, { color: colors.primary }]}>
                {category.shortLabel}
              </Text>
            </Pressable>
          </>
        ) : null}
        {sub ? (
          <>
            <Text style={{ color: colors.inkFaint }}> › </Text>
            <View style={styles.crumbRow}>
              <Icon
                name={resolveCatalogIcon(sub.id)}
                size={14}
                color={colors.ink}
                weight="bold"
              />
              <Text style={[styles.crumbCurrent, { color: colors.ink }]}>{sub.label}</Text>
            </View>
          </>
        ) : null}
      </View>

      {!value.universeId ? (
        <View style={styles.list}>
          {categories.map((cat) => (
            <Pressable
              key={cat.id}
              onPress={() =>
                onChange({
                  universeId: cat.id,
                  subCategoryId: null,
                  platformId: null,
                })
              }
              style={[
                styles.card,
                { backgroundColor: colors.white, borderColor: colors.border },
              ]}
            >
              <View style={[styles.icon, { backgroundColor: cat.color }]}>
                <Icon name={universeIcon(cat.id)} size={22} color="#fff" weight="bold" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.ink }]}>{cat.label}</Text>
                <Text style={{ color: colors.inkMuted, fontFamily: fonts.body }}>
                  {cat.subCategories.length} choix · {cat.description}
                </Text>
              </View>
              <Icon name="chevronRight" size={18} color={colors.inkFaint} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {value.universeId && !value.subCategoryId && category ? (
        <View>
          <Text style={[styles.section, { color: colors.ink }]}>
            {isGamingGrid ? 'Choisis ton jeu' : 'Choisis une activité'}
          </Text>
          <Text style={[styles.sectionHint, { color: colors.inkMuted }]}>
            {isGamingGrid
              ? 'Tuiles joueur — icônes marque (Simple Icons) si dispo, sinon Phosphor'
              : `${category.subCategories.length} options`}
          </Text>
          <View style={isGamingGrid ? styles.gameGrid : styles.activityGrid}>
            {category.subCategories.map((item, index) => {
              const accent = tileAccent(category.id, index);
              return (
                <Pressable
                  key={item.id}
                  onPress={() =>
                    onChange({
                      universeId: category.id,
                      subCategoryId: item.id,
                      platformId: null,
                    })
                  }
                  style={[
                    isGamingGrid ? styles.gameTile : styles.activityTile,
                    {
                      backgroundColor: colors.white,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Icon
                    name={resolveCatalogIcon(item.id)}
                    size={isGamingGrid ? 28 : 22}
                    color={accent}
                    weight="bold"
                    branded={isGamingGrid}
                  />
                  <Text
                    style={[styles.gameLabel, { color: colors.ink }]}
                    numberOfLines={2}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {value.universeId && value.subCategoryId && sub ? (
        <View>
          <Text style={[styles.section, { color: colors.ink }]}>
            {sub.platforms?.length
              ? requirePlatform
                ? 'Plateforme'
                : 'Plateforme (optionnel)'
              : 'Aucune plateforme pour cette activité'}
          </Text>
          <View style={styles.platformGrid}>
            {(sub.platforms ?? []).map((platform) => {
              const selected = value.platformId === platform.id;
              return (
                <Pressable
                  key={platform.id}
                  onPress={() =>
                    onChange({
                      universeId: value.universeId,
                      subCategoryId: value.subCategoryId,
                      platformId: selected ? null : platform.id,
                    })
                  }
                  style={[
                    styles.platformTile,
                    {
                      backgroundColor: selected ? colors.primarySoft : colors.white,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Icon
                    name={resolveCatalogIcon(platform.id)}
                    size={16}
                    color={selected ? colors.primaryDark : colors.ink}
                    weight="bold"
                  />
                  <Text
                    style={[
                      styles.platformLabel,
                      { color: selected ? colors.primaryDark : colors.ink },
                    ]}
                  >
                    {platform.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {!requirePlatform && !sub.platforms?.length ? (
            <View style={styles.wrapChips}>
              <Chip
                name="check"
                label="Continuer sans plateforme"
                selected
                onPress={() => undefined}
              />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  crumbs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  crumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  crumb: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
  crumbCurrent: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  list: { gap: spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
  },
  section: {
    fontFamily: fonts.displaySemi,
    fontSize: 18,
    marginBottom: 4,
  },
  sectionHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginBottom: spacing.md,
  },
  gameGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gameTile: {
    width: '30%',
    flexGrow: 1,
    minWidth: 96,
    maxWidth: '32%',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 8,
  },
  activityTile: {
    width: '47%',
    flexGrow: 1,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  gameLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  platformGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  platformTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  platformLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
  wrapChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
});
