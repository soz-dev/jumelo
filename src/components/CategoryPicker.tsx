import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GameArtImage } from './GameArtImage';
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
import { fonts, radii, spacing, withHexAlpha } from '../constants/theme';
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
        {/* Pas le nom du jeu ici : il est mis en avant dans le hero plateforme */}
      </View>

      {!value.universeId ? (
        <View>
          <Text style={[styles.section, { color: colors.ink }]}>Choisis ton univers</Text>
          <Text style={[styles.sectionHint, { color: colors.inkMuted }]}>
            Tuiles — même esprit que les jeux
          </Text>
          <View style={styles.universeGrid}>
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
                  styles.universeTile,
                  {
                    backgroundColor: withHexAlpha(colors.primarySoft, 0.9),
                    borderColor: withHexAlpha(colors.primary, 0.14),
                  },
                ]}
              >
                <View style={[styles.universeIcon, { backgroundColor: cat.color }]}>
                  <Icon name={universeIcon(cat.id)} size={28} color="#fff" weight="bold" />
                </View>
                <Text style={[styles.universeTitle, { color: colors.ink }]} numberOfLines={2}>
                  {cat.shortLabel || cat.label}
                </Text>
                <Text style={[styles.universeMeta, { color: colors.inkMuted }]} numberOfLines={2}>
                  {cat.subCategories.length} choix
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {value.universeId && !value.subCategoryId && category ? (
        <View>
          <Text style={[styles.section, { color: colors.ink }]}>
            {isGamingGrid ? 'Choisis ton jeu' : 'Choisis une activité'}
          </Text>
          <Text style={[styles.sectionHint, { color: colors.inkMuted }]}>
            {isGamingGrid
              ? 'Tuiles joueur — jaquettes store si dispo, sinon Phosphor'
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
                      backgroundColor: withHexAlpha(colors.primarySoft, 0.9),
                      borderColor: withHexAlpha(colors.primary, 0.14),
                    },
                  ]}
                >
                  {isGamingGrid ? (
                    <GameArtImage
                      catalogId={item.id}
                      size={44}
                      color={accent}
                      brandedFallback
                    />
                  ) : (
                    <Icon
                      name={resolveCatalogIcon(item.id)}
                      size={22}
                      color={accent}
                      weight="bold"
                    />
                  )}
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
        <View style={styles.platformStep}>
          <View
            style={[
              styles.hero,
              {
                backgroundColor: withHexAlpha(colors.primarySoft, 0.95),
                borderColor: withHexAlpha(colors.primary, 0.18),
              },
            ]}
          >
            {isGamingGrid ? (
              <GameArtImage
                catalogId={sub.id}
                size={96}
                color={category?.color ?? colors.primary}
                brandedFallback
              />
            ) : (
              <View
                style={[
                  styles.heroIcon,
                  { backgroundColor: category?.color ?? colors.primary },
                ]}
              >
                <Icon
                  name={resolveCatalogIcon(sub.id)}
                  size={40}
                  color="#fff"
                  weight="bold"
                />
              </View>
            )}
            <Text style={[styles.heroTitle, { color: colors.ink }]}>{sub.label}</Text>
            {category ? (
              <View style={[styles.heroBadge, { backgroundColor: colors.primarySoft }]}>
                <Icon
                  name={universeIcon(category.id)}
                  size={14}
                  color={colors.primaryDark}
                  weight="bold"
                />
                <Text style={[styles.heroBadgeText, { color: colors.primaryDark }]}>
                  {category.shortLabel}
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={[styles.section, { color: colors.ink }]}>
            {sub.platforms?.length
              ? requirePlatform
                ? 'Sur quelle plateforme ?'
                : 'Plateforme (optionnel)'
              : 'Aucune plateforme pour cette activité'}
          </Text>
          <Text style={[styles.sectionHint, { color: colors.inkMuted }]}>
            Choisis où tu joues pour trouver un partenaire au bon endroit
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
                    styles.platformTileLarge,
                    {
                      backgroundColor: selected
                        ? withHexAlpha(colors.primary, 0.16)
                        : withHexAlpha(colors.primarySoft, 0.9),
                      borderColor: selected
                        ? colors.primary
                        : withHexAlpha(colors.primary, 0.14),
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.platformIconWrap,
                      {
                        backgroundColor: selected ? colors.primary : withHexAlpha(colors.primary, 0.12),
                      },
                    ]}
                  >
                    <Icon
                      name={resolveCatalogIcon(platform.id)}
                      size={22}
                      color={selected ? '#fff' : colors.primaryDark}
                      weight="bold"
                    />
                  </View>
                  <Text
                    style={[
                      styles.platformLabelLarge,
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
  universeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  universeTile: {
    width: '47%',
    flexGrow: 1,
    minWidth: 140,
    maxWidth: '48.5%',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
  },
  universeIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  universeTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 20,
  },
  universeMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    textAlign: 'center',
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
  platformStep: {
    gap: spacing.sm,
  },
  hero: {
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 20,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  heroIcon: {
    width: 96,
    height: 96,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontFamily: fonts.displaySemi,
    fontSize: 26,
    lineHeight: 30,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  heroBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  platformGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  platformTileLarge: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  platformIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformLabelLarge: {
    fontFamily: fonts.bodyBold,
    fontSize: 17,
  },
  wrapChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
});
