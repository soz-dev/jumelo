import { LinearGradient } from 'expo-linear-gradient';
import { type Href } from 'expo-router';
import React, { useCallback, useEffect, type ReactNode } from 'react';
import {
  BackHandler,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { ActivityArtImage } from './ActivityArtImage';
import { GameArtImage } from './GameArtImage';
import { TornBleedGameArt } from './TornBleedGameArt';
import {
  ActivityDetails,
  DetailField,
  emptyActivityDetails,
  getActivityDetailFields,
  platformFromDetails,
} from '../constants/activityDetails';
import {
  Category,
  PlatformId,
  SubCategory,
  UniverseId,
  categories,
  getCategory,
  getSubCategory,
} from '../constants/catalog';
import { fonts, mixHex, radii, spacing, withHexAlpha } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import {
  Icon,
  elevation,
  motion,
  resolveCatalogIcon,
  universeIcon,
} from '../design-system';
import { safeBack } from '../lib/navigation';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Extrémité sombre du dégradé par univers (identité catalogue). */
const UNIVERSE_DARK: Record<UniverseId, string> = {
  gaming: '#5B3FD4',
  sports: '#0A6B67',
  education: '#1D4ED8',
  music: '#D97706',
  hobbies: '#BE185D',
};

const SCREEN_PAD = spacing.lg * 2;
const GRID_GAP = 12;
const GAME_COLS = 2;
const GAME_COVER_W = Math.floor(
  (Dimensions.get('window').width - SCREEN_PAD - GRID_GAP) / GAME_COLS,
);
const GAME_COVER_H = Math.round(GAME_COVER_W * 1.48);

function ScalePressable({
  onPress,
  style,
  children,
}: {
  onPress: () => void;
  style?: ViewStyle | ViewStyle[];
  children: ReactNode;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.97, motion.spring);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, motion.spring);
      }}
      style={[style, animStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}

/**
 * Option Précisions — surface claire teintée par univers (pas de slab gradient).
 * Selected = bordure accent + fill discret / glass.
 */
function SoftOption({
  accent,
  selected,
  onPress,
  layout = 'tile',
  icon,
  branded,
  label,
}: {
  accent: string;
  selected?: boolean;
  onPress: () => void;
  layout?: 'tile' | 'row' | 'bool' | 'scale' | 'year';
  icon?: string;
  branded?: boolean;
  label: string;
}) {
  const { colors } = useTheme();
  const outerStyle =
    layout === 'row'
      ? styles.optionOuterFull
      : layout === 'bool'
        ? styles.boolOuter
        : layout === 'tile'
          ? styles.optionOuter
          : undefined;

  return (
    <ScalePressable onPress={onPress} style={outerStyle}>
      <View
        style={[
          layout === 'row'
            ? styles.optionTileRow
            : layout === 'bool'
              ? styles.boolTile
              : layout === 'scale'
                ? styles.scaleChip
                : layout === 'year'
                  ? styles.yearChip
                  : styles.optionTile,
          elevation.soft,
          {
            backgroundColor: colors.white,
            borderColor: selected ? accent : withHexAlpha(accent, 0.2),
          },
        ]}
      >
        <View
          style={[
            styles.optionWash,
            {
              backgroundColor: withHexAlpha(accent, selected ? 0.14 : 0.06),
            },
          ]}
          pointerEvents="none"
        />
        {layout === 'row' && icon ? (
          <View
            style={[
              styles.optionIconWrap,
              {
                backgroundColor: selected
                  ? withHexAlpha(accent, 0.2)
                  : withHexAlpha(accent, 0.1),
              },
            ]}
          >
            <Icon
              name={resolveCatalogIcon(icon)}
              size={22}
              color={accent}
              weight={selected ? 'fill' : 'bold'}
              branded={branded}
            />
          </View>
        ) : null}
        <Text
          style={[
            layout === 'scale' || layout === 'year'
              ? styles.scaleChipText
              : styles.optionLabel,
            {
              color: selected ? accent : colors.ink,
              fontFamily: selected ? fonts.bodyBold : fonts.bodyMedium,
            },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
    </ScalePressable>
  );
}

function UniverseTile({
  cat,
  hero,
  onPress,
}: {
  cat: Category;
  hero?: boolean;
  onPress: () => void;
}) {
  const dark = UNIVERSE_DARK[cat.id];
  const soft = mixHex(cat.color, '#FFFFFF', 0.28);
  const count = cat.subCategories.length;

  return (
    <ScalePressable
      onPress={onPress}
      style={[styles.universeGlow, elevation.glow(cat.color)]}
    >
      <LinearGradient
        colors={[soft, cat.color, dark]}
        locations={[0, 0.48, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.universeTile, hero ? styles.universeTileHero : null]}
      >
        <LinearGradient
          colors={[
            'rgba(255,255,255,0.3)',
            'transparent',
            'rgba(0,0,0,0.14)',
          ]}
          locations={[0, 0.45, 1]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <View
          style={[
            styles.orbTL,
            hero ? styles.orbTLHero : null,
            { backgroundColor: withHexAlpha('#fff', 0.16) },
          ]}
          pointerEvents="none"
        />
        <View
          style={[
            styles.orbBR,
            hero ? styles.orbBRHero : null,
            { backgroundColor: withHexAlpha(dark, 0.45) },
          ]}
          pointerEvents="none"
        />

        <View style={styles.watermark} pointerEvents="none">
          <Icon
            name={universeIcon(cat.id)}
            size={hero ? 108 : 78}
            color="rgba(255,255,255,0.14)"
            weight="fill"
          />
        </View>

        {!hero ? (
          <View style={styles.universeCountPill} pointerEvents="none">
            <Text style={styles.universeCountText}>{count}</Text>
          </View>
        ) : null}

        <View style={hero ? styles.universeHeroRow : styles.universeBody}>
          <View
            style={[
              styles.universeIconGlass,
              hero ? styles.universeIconGlassHero : null,
            ]}
          >
            <Icon
              name={universeIcon(cat.id)}
              size={hero ? 30 : 26}
              color="#fff"
              weight="bold"
            />
          </View>

          <View style={hero ? styles.universeHeroCopy : styles.universeCopy}>
            <Text
              style={[styles.universeTitle, hero ? styles.universeTitleHero : null]}
              numberOfLines={2}
            >
              {cat.shortLabel || cat.label}
            </Text>
            <Text style={styles.universeMeta} numberOfLines={hero ? 2 : 2}>
              {cat.description}
            </Text>
          </View>

          {hero ? (
            <View style={styles.universeCta}>
              <Text style={styles.universeCtaText}>{count}</Text>
              <Icon name="chevronRight" size={14} color="#fff" weight="bold" />
            </View>
          ) : null}
        </View>
      </LinearGradient>
    </ScalePressable>
  );
}

export type CategoryPath = {
  universeId: UniverseId | null;
  subCategoryId: string | null;
  /** Rétrocompat — synchronisé depuis activityDetails.platform */
  platformId: PlatformId | null;
  activityDetails: ActivityDetails;
};

type Props = {
  value: CategoryPath;
  onChange: (next: CategoryPath) => void;
  /** Si true, les champs requis des précisions doivent être remplis (écran catégories) */
  requireDetails?: boolean;
  /** @deprecated alias de requireDetails */
  requirePlatform?: boolean;
};

export function emptyCategoryPath(
  overrides?: Partial<CategoryPath>,
): CategoryPath {
  return {
    universeId: null,
    subCategoryId: null,
    platformId: null,
    activityDetails: emptyActivityDetails(),
    ...overrides,
  };
}

function hasFilledDetails(details: ActivityDetails): boolean {
  return Object.values(details).some((value) => value != null && value !== '');
}

/**
 * Remonte d’un cran le drill-down.
 * Ordre : précisions → activités → univers → `null` (sortir de l’écran).
 */
export function popCategoryPath(path: CategoryPath): CategoryPath | null {
  if (
    path.subCategoryId != null ||
    path.platformId != null ||
    hasFilledDetails(path.activityDetails)
  ) {
    return emptyCategoryPath(
      path.universeId != null ? { universeId: path.universeId } : undefined,
    );
  }
  if (path.universeId != null) {
    return emptyCategoryPath();
  }
  return null;
}

/** Back header / hardware : déstacke le path local, sinon `safeBack`. */
export function useCategoryPathBack(
  path: CategoryPath,
  setPath: (next: CategoryPath) => void,
  fallback: Href = '/(tabs)/home',
) {
  const onBack = useCallback(() => {
    const prev = popCategoryPath(path);
    if (prev) {
      setPath(prev);
      return;
    }
    safeBack(fallback);
  }, [fallback, path, setPath]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const prev = popCategoryPath(path);
      if (prev) {
        setPath(prev);
        return true;
      }
      safeBack(fallback);
      return true;
    });
    return () => sub.remove();
  }, [fallback, path, setPath]);

  return onBack;
}

function tileAccent(universeId: UniverseId | undefined, index: number): string {
  const palette =
    universeId === 'gaming'
      ? ['#0F8F8A', '#3D7EA6', '#FF5A45', '#F5A623', '#5B8DEF', '#00C2A8']
      : universeId === 'sports'
        ? ['#0F8F8A', '#27AE60', '#16A085', '#F39C12']
        : ['#0F8F8A', '#3D7EA6', '#C45C26', '#6B5B95'];
  return palette[index % palette.length];
}

function yearsChoices(min = 0, max = 40): number[] {
  const early = [0, 1, 2, 3, 5, 7, 10, 15, 20];
  return early.filter((n) => n >= min && n <= max).concat(max > 20 ? [max] : []);
}

function patchDetails(
  value: CategoryPath,
  fieldId: string,
  nextValue: string | number | boolean | null,
): CategoryPath {
  const activityDetails = { ...value.activityDetails, [fieldId]: nextValue };
  return {
    universeId: value.universeId,
    subCategoryId: value.subCategoryId,
    platformId: platformFromDetails(activityDetails),
    activityDetails,
  };
}

export function CategoryPicker({ value, onChange, requireDetails, requirePlatform }: Props) {
  const { colors } = useTheme();
  const mustFill = requireDetails ?? requirePlatform ?? false;
  const category: Category | undefined = value.universeId
    ? getCategory(value.universeId)
    : undefined;
  const sub: SubCategory | undefined =
    value.universeId && value.subCategoryId
      ? getSubCategory(value.universeId, value.subCategoryId)
      : undefined;

  const isGamingGrid = value.universeId === 'gaming';
  const detailFields: DetailField[] =
    value.universeId && value.subCategoryId
      ? getActivityDetailFields(value.universeId, value.subCategoryId)
      : [];

  const accent = category?.color ?? colors.primary;
  const accentDark =
    (category ? UNIVERSE_DARK[category.id] : undefined) ?? colors.primaryDark;

  return (
    <View style={styles.wrap}>
      <View style={styles.crumbs}>
        <Pressable onPress={() => onChange(emptyCategoryPath())}>
          <Text style={[styles.crumb, { color: colors.primary }]}>Catégories</Text>
        </Pressable>
        {category ? (
          <>
            <Text style={{ color: colors.inkFaint }}> › </Text>
            <Pressable
              onPress={() =>
                onChange(
                  emptyCategoryPath({
                    universeId: category.id,
                  }),
                )
              }
              style={styles.crumbRow}
            >
              <Icon
                name={universeIcon(category.id)}
                size={14}
                color={accent}
                weight="bold"
              />
              <Text style={[styles.crumb, { color: accent }]}>
                {category.shortLabel}
              </Text>
            </Pressable>
          </>
        ) : null}
      </View>

      {!value.universeId ? (
        <View>
          <Text style={[styles.section, { color: colors.ink }]}>Choisis ton univers</Text>
          <Text style={[styles.sectionHint, { color: colors.inkMuted }]}>
            Chaque univers a sa couleur — tape pour explorer
          </Text>
          <View style={styles.universeGrid}>
            {categories.map((cat, index) => {
              const hero = index === 0;
              return (
                <Animated.View
                  key={cat.id}
                  entering={FadeInDown.delay(40 + index * 55).duration(340)}
                  style={hero ? styles.universeHeroOuter : styles.universeOuter}
                >
                  <UniverseTile
                    cat={cat}
                    hero={hero}
                    onPress={() =>
                      onChange(
                        emptyCategoryPath({
                          universeId: cat.id,
                        }),
                      )
                    }
                  />
                </Animated.View>
              );
            })}
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
              ? 'Grille store — jaquettes portrait'
              : `${category.subCategories.length} options — illustrations colorées`}
          </Text>
          <View style={isGamingGrid ? styles.gameGrid : styles.activityGrid}>
            {category.subCategories.map((item, index) => {
              const itemAccent = tileAccent(category.id, index);
              return (
                <Animated.View
                  key={item.id}
                  entering={FadeInDown.delay(30 + index * 40).duration(320)}
                  style={isGamingGrid ? styles.gameTile : styles.activityOuter}
                >
                  <ScalePressable
                    onPress={() =>
                      onChange(
                        emptyCategoryPath({
                          universeId: category.id,
                          subCategoryId: item.id,
                        }),
                      )
                    }
                    style={isGamingGrid ? styles.gamePress : undefined}
                  >
                    {isGamingGrid ? (
                      <>
                        <View
                          style={[
                            styles.gameCoverFrame,
                            elevation.lift,
                            {
                              width: GAME_COVER_W,
                              height: GAME_COVER_H,
                              borderColor: withHexAlpha(accent, 0.18),
                              shadowColor: accentDark,
                            },
                          ]}
                        >
                          <GameArtImage
                            catalogId={item.id}
                            size={GAME_COVER_W}
                            height={GAME_COVER_H}
                            color={accent}
                            brandedFallback
                          />
                          <LinearGradient
                            colors={['transparent', 'rgba(18,33,43,0.55)']}
                            locations={[0.55, 1]}
                            style={styles.gameCoverFade}
                            pointerEvents="none"
                          />
                        </View>
                        <Text
                          style={[styles.gameLabel, { color: colors.ink }]}
                          numberOfLines={2}
                        >
                          {item.label}
                        </Text>
                      </>
                    ) : (
                      <View
                        style={[
                          styles.activityTile,
                          elevation.soft,
                          {
                            backgroundColor: colors.white,
                            borderColor: withHexAlpha(accent, 0.2),
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.activityWash,
                            { backgroundColor: withHexAlpha(accent, 0.08) },
                          ]}
                          pointerEvents="none"
                        />
                        <ActivityArtImage
                          catalogId={item.id}
                          size={44}
                          color={itemAccent}
                          backgroundColor={withHexAlpha(accent, 0.12)}
                        />
                        <Text
                          style={[styles.activityLabel, { color: colors.ink }]}
                          numberOfLines={2}
                        >
                          {item.label}
                        </Text>
                      </View>
                    )}
                  </ScalePressable>
                </Animated.View>
              );
            })}
          </View>
        </View>
      ) : null}

      {value.universeId && value.subCategoryId && sub ? (
        <View style={styles.detailsStep}>
          <Animated.View entering={FadeInDown.duration(320)}>
            <View style={[styles.heroOuter, elevation.glow(accent)]}>
              <LinearGradient
                colors={[
                  mixHex(accent, '#FFFFFF', 0.22),
                  accent,
                  accentDark,
                ]}
                locations={[0, 0.5, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.hero}
              >
                {isGamingGrid ? (
                  <TornBleedGameArt
                    catalogId={sub.id}
                    opacity={0.4}
                    color={accent}
                  />
                ) : null}
                <LinearGradient
                  colors={[
                    'rgba(255,255,255,0.22)',
                    'transparent',
                    'rgba(0,0,0,0.28)',
                  ]}
                  locations={[0, 0.4, 1]}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />
                {isGamingGrid ? null : (
                  <ActivityArtImage
                    catalogId={sub.id}
                    size={96}
                    color={accent}
                    backgroundColor="rgba(255,255,255,0.92)"
                  />
                )}
                <View style={styles.heroCopy}>
                  <Text style={styles.heroTitle}>{sub.label}</Text>
                  {category ? (
                    <View style={styles.heroBadge}>
                      <Icon
                        name={universeIcon(category.id)}
                        size={14}
                        color="#fff"
                        weight="bold"
                      />
                      <Text style={styles.heroBadgeText}>{category.shortLabel}</Text>
                    </View>
                  ) : null}
                </View>
              </LinearGradient>
            </View>
          </Animated.View>

          <Text style={[styles.section, { color: colors.ink }]}>
            {mustFill ? 'Précisions' : 'Précisions (optionnel)'}
          </Text>
          <Text style={[styles.sectionHint, { color: colors.inkMuted }]}>
            Quelques infos pour un meilleur match
          </Text>

          {detailFields.map((field) => (
            <View key={field.id} style={styles.fieldBlock}>
              <Text style={[styles.fieldLabel, { color: colors.ink }]}>
                {field.label}
                {field.required && mustFill ? ' *' : ''}
              </Text>
              {field.hint ? (
                <Text style={[styles.fieldHint, { color: colors.inkMuted }]}>{field.hint}</Text>
              ) : null}

              {field.type === 'select' ? (
                <View style={styles.optionGrid}>
                  {(field.options ?? []).map((option) => {
                    const selected = value.activityDetails[field.id] === option.id;
                    const isPlatform = field.id === 'platform';
                    return (
                      <SoftOption
                        key={option.id}
                        accent={accent}
                        selected={selected}
                        layout={isPlatform ? 'row' : 'tile'}
                        icon={isPlatform ? option.id : undefined}
                        branded={isPlatform}
                        label={option.label}
                        onPress={() =>
                          onChange(
                            patchDetails(
                              value,
                              field.id,
                              selected ? null : option.id,
                            ),
                          )
                        }
                      />
                    );
                  })}
                </View>
              ) : null}

              {field.type === 'boolean' ? (
                <View style={styles.boolRow}>
                  {[
                    { id: true, label: 'Oui' },
                    { id: false, label: 'Non' },
                  ].map((option) => {
                    const selected = value.activityDetails[field.id] === option.id;
                    return (
                      <SoftOption
                        key={String(option.id)}
                        accent={accent}
                        selected={selected}
                        layout="bool"
                        label={option.label}
                        onPress={() =>
                          onChange(patchDetails(value, field.id, option.id))
                        }
                      />
                    );
                  })}
                </View>
              ) : null}

              {field.type === 'scale' ? (
                <View style={styles.scaleRow}>
                  {Array.from(
                    { length: (field.max ?? 10) - (field.min ?? 1) + 1 },
                    (_, i) => (field.min ?? 1) + i,
                  ).map((n) => {
                    const selected = value.activityDetails[field.id] === n;
                    return (
                      <SoftOption
                        key={n}
                        accent={accent}
                        selected={selected}
                        layout="scale"
                        label={String(n)}
                        onPress={() => onChange(patchDetails(value, field.id, n))}
                      />
                    );
                  })}
                </View>
              ) : null}

              {field.type === 'years' ? (
                <View style={styles.scaleRow}>
                  {yearsChoices(field.min, field.max).map((n) => {
                    const selected = value.activityDetails[field.id] === n;
                    const label = n === 0 ? 'Début' : n >= 40 ? '40+' : `${n}`;
                    return (
                      <SoftOption
                        key={n}
                        accent={accent}
                        selected={selected}
                        layout="year"
                        label={label}
                        onPress={() => onChange(patchDetails(value, field.id, n))}
                      />
                    );
                  })}
                </View>
              ) : null}
            </View>
          ))}
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
  universeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  universeHeroOuter: {
    width: '100%',
  },
  universeOuter: {
    width: '47%',
    flexGrow: 1,
    minWidth: 140,
    maxWidth: '48.5%',
  },
  universeGlow: {
    borderRadius: 22,
  },
  universeTile: {
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 14,
    minHeight: 148,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  universeTileHero: {
    minHeight: 132,
    paddingVertical: 20,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  orbTL: {
    position: 'absolute',
    top: -28,
    left: -20,
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  orbTLHero: {
    width: 120,
    height: 120,
    borderRadius: 60,
    top: -36,
    left: -28,
  },
  orbBR: {
    position: 'absolute',
    bottom: -36,
    right: -24,
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  orbBRHero: {
    width: 140,
    height: 140,
    borderRadius: 70,
    bottom: -48,
    right: -32,
  },
  watermark: {
    position: 'absolute',
    right: -4,
    bottom: -8,
    opacity: 1,
  },
  universeBody: {
    alignItems: 'flex-start',
    gap: 10,
    zIndex: 1,
  },
  universeHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    zIndex: 1,
  },
  universeIconGlass: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  universeIconGlassHero: {
    width: 58,
    height: 58,
    borderRadius: 18,
  },
  universeCopy: {
    gap: 2,
    width: '100%',
    paddingRight: 28,
  },
  universeHeroCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  universeTitle: {
    fontFamily: fonts.displaySemi,
    fontSize: 17,
    letterSpacing: -0.3,
    lineHeight: 22,
    color: '#fff',
  },
  universeTitleHero: {
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.5,
  },
  universeMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.82)',
  },
  universeCountPill: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2,
    minWidth: 28,
    height: 22,
    paddingHorizontal: 8,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  universeCountText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: '#fff',
  },
  universeCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  universeCtaText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: '#fff',
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
    gap: GRID_GAP,
  },
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gameTile: {
    width: GAME_COVER_W,
  },
  gamePress: {
    width: GAME_COVER_W,
    gap: 10,
  },
  gameCoverFrame: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    backgroundColor: '#12212B',
  },
  gameCoverFade: {
    ...StyleSheet.absoluteFillObject,
  },
  gameLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    textAlign: 'left',
    lineHeight: 17,
    letterSpacing: -0.15,
    paddingHorizontal: 2,
    width: GAME_COVER_W,
  },
  activityOuter: {
    width: '47%',
    flexGrow: 1,
  },
  activityTile: {
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  activityWash: {
    ...StyleSheet.absoluteFillObject,
  },
  activityLabel: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  detailsStep: {
    gap: spacing.sm,
  },
  heroOuter: {
    borderRadius: 28,
    marginBottom: spacing.md,
  },
  hero: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderRadius: 28,
    minHeight: 196,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    overflow: 'hidden',
  },
  heroCopy: {
    zIndex: 2,
    alignItems: 'center',
    gap: spacing.sm,
  },
  heroTitle: {
    fontFamily: fonts.displaySemi,
    fontSize: 26,
    lineHeight: 30,
    textAlign: 'center',
    letterSpacing: -0.4,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  heroBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: '#fff',
  },
  fieldBlock: {
    marginBottom: spacing.md,
    gap: 6,
  },
  fieldLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  fieldHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    marginBottom: 4,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionOuter: {
    minWidth: '30%',
    flexGrow: 1,
  },
  optionOuterFull: {
    width: '100%',
  },
  optionTile: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTileRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    overflow: 'hidden',
  },
  optionWash: {
    ...StyleSheet.absoluteFillObject,
  },
  optionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  optionLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    zIndex: 1,
  },
  boolRow: {
    flexDirection: 'row',
    gap: 10,
  },
  boolOuter: {
    flex: 1,
  },
  boolTile: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 14,
    overflow: 'hidden',
  },
  scaleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  scaleChip: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  yearChip: {
    minWidth: 52,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  scaleChipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    zIndex: 1,
  },
});
