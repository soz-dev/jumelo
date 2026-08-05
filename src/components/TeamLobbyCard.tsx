import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ActivityArtImage } from './ActivityArtImage';
import { GameArtImage } from './GameArtImage';
import { findCatalogInText, getCategory } from '../constants/catalog';
import type { Team } from '../data/mock';
import { useTheme } from '../context/ThemeContext';
import {
  Icon,
  elevation,
  fonts,
  spacing,
  themeBrandColors,
  themeGradientAngles,
  universeIcon,
  withHexAlpha,
} from '../design-system';
import { baseColors } from '../constants/theme';
import type { TeamMembershipState } from '../lib/api/teams';
import type { DuoRankSnapshot } from '../lib/duoPoints';

export function joinLabel(
  state: TeamMembershipState,
  locked: boolean,
  _capacity = 2,
): string {
  switch (state) {
    case 'owner':
      return 'Gérer';
    case 'member':
      return 'Ouvrir le chat';
    case 'pending':
      return 'En attente';
    case 'rejected':
      return locked ? 'Redemander' : 'Rejoindre';
    default:
      return locked ? 'Demander' : 'Rejoindre';
  }
}

/** Légende accès carte lobby : Complet / Sur demande / Ouvert. */
export function lobbyAccessLabel(team: {
  locked: boolean;
  membersCount: number;
  capacity: number;
  memberIds?: string[];
}): { label: string; icon: 'lock' | 'lock-open' } {
  const count = Math.max(
    team.membersCount,
    team.memberIds?.length ?? 0,
  );
  const full = count >= team.capacity;
  if (full) {
    return { label: 'Complet', icon: 'lock' };
  }
  if (team.locked) {
    return { label: 'Sur demande', icon: 'lock' };
  }
  return { label: 'Ouvert', icon: 'lock-open' };
}

type Props = {
  team: Team;
  state: TeamMembershipState;
  busy: boolean;
  onJoin: () => void;
  onDetails: () => void;
  duoRank?: DuoRankSnapshot | null;
  mine?: boolean;
};

const ART_H = 148;
const SHEET_OVERLAP = 22;

function CardArt({
  team,
  accent,
}: {
  team: Team;
  accent: string;
}) {
  const match = findCatalogInText(
    `${team.name} ${team.activity}`,
    team.universe,
  );
  const catalogId = match?.id;
  const isGaming = team.universe === 'gaming';

  if (isGaming && catalogId) {
    return (
      <GameArtImage
        catalogId={catalogId}
        size={420}
        height={ART_H}
        color={accent}
        brandedFallback
        resizeMode="cover"
        borderRadius={0}
        style={styles.artImage}
      />
    );
  }

  if (catalogId) {
    return (
      <View style={[styles.artFallback, { backgroundColor: withHexAlpha(accent, 0.12) }]}>
        <ActivityArtImage
          catalogId={catalogId}
          size={120}
          color={accent}
          backgroundColor="transparent"
        />
      </View>
    );
  }

  return (
    <View style={[styles.artFallback, { backgroundColor: withHexAlpha(accent, 0.14) }]}>
      <Icon
        name={universeIcon(team.universe)}
        size={72}
        color={accent}
        weight="fill"
      />
    </View>
  );
}

export function TeamLobbyCard({
  team,
  state,
  busy,
  onJoin,
  onDetails,
  duoRank = null,
  mine = false,
}: Props) {
  const { colors } = useTheme();
  const cat = getCategory(team.universe);
  const accent = cat?.color ?? colors.primary;
  const progress = Math.min(1, team.membersCount / team.capacity);
  const slotsLeft = Math.max(0, team.capacity - team.membersCount);
  const label = joinLabel(state, team.locked, team.capacity);
  const access = lobbyAccessLabel(team);
  const isPending = state === 'pending';
  const isMemberOrOwner = state === 'member' || state === 'owner';
  const joinDisabled =
    isPending || busy || (slotsLeft === 0 && !isMemberOrOwner);

  /**
   * Palette claire — fond blanc, texte encre, accent catégorie.
   */
  const onCard = colors.ink;
  const onCardMuted = colors.inkMuted;
  const onCardFaint = colors.inkFaint;
  const cardSurface = colors.cream;
  const brand = themeBrandColors(colors);
  const brandAngle = themeGradientAngles.brand;

  return (
    <View style={[styles.shell, elevation.soft]}>
      <View style={styles.card}>
        {/* Header media — inchangé (top) */}
        <View style={styles.media}>
          <CardArt team={team} accent={accent} />
          {/* Fondu vers blanc en bas pour rejoindre le panneau blanc */}
          <LinearGradient
            colors={['rgba(0,0,0,0.28)', 'transparent', withHexAlpha(colors.white, 0.6), colors.white]}
            locations={[0, 0.3, 0.72, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          {mine ? (
            <View style={styles.mineBadge}>
              <Text style={styles.mineBadgeText}>Ton jumelo</Text>
            </View>
          ) : null}
          <View style={styles.mediaTop}>
            <View style={styles.mediaChip}>
              <Icon
                name={access.icon}
                size={11}
                color="#fff"
                weight="bold"
              />
              <Text style={styles.mediaChipText}>{access.label}</Text>
            </View>
          </View>
          {!mine && team.vibe ? (
            <View style={styles.vibeChip}>
              <Text style={styles.mediaChipText}>{team.vibe}</Text>
            </View>
          ) : null}
          <Text style={styles.mediaActivity} numberOfLines={1}>
            {team.activity}
          </Text>
        </View>

        {/* Panneau blanc */}
        <View style={[styles.sheet, { backgroundColor: colors.white }]}>
          <View style={[styles.accentRail, { backgroundColor: accent }]} />

          <View style={styles.sheetTop}>
            <View style={styles.sheetMain}>
              <Text style={[styles.title, { color: onCard }]} numberOfLines={2}>
                {team.name}
              </Text>

              {duoRank ? (
                <View style={styles.rankLine}>
                  <View style={[styles.rankDot, { backgroundColor: duoRank.color }]} />
                  <Text style={[styles.rankName, { color: duoRank.color }]}>
                    {duoRank.displayName}
                  </Text>
                  <Text style={[styles.rankMeta, { color: onCardFaint }]}>
                    Nv.{duoRank.level}
                  </Text>
                  <Text style={[styles.rankMeta, { color: onCardFaint }]}>·</Text>
                  <Text
                    style={[styles.rankMeta, { color: onCardMuted, flex: 1 }]}
                    numberOfLines={1}
                  >
                    {duoRank.title}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.rankMeta, { color: onCardMuted }]}>
                  Niveau · {team.levelLabel}
                </Text>
              )}

              <View style={styles.placeRow}>
                <Icon name="city" size={13} color={onCardFaint} />
                <Text style={[styles.placeCity, { color: onCardMuted }]}>
                  {team.city}
                </Text>
                {team.nextSession && team.nextSession !== 'À définir' ? (
                  <>
                    <Text style={{ color: onCardFaint }}>·</Text>
                    <Text
                      style={[styles.placeCity, { color: onCardFaint, flex: 1 }]}
                      numberOfLines={1}
                    >
                      {team.nextSession}
                    </Text>
                  </>
                ) : null}
              </View>
            </View>

            {/* Compteur places type “dial” */}
            <View
              style={[
                styles.slotDial,
                {
                  borderColor: withHexAlpha(accent, 0.5),
                  backgroundColor: withHexAlpha(accent, 0.06),
                },
              ]}
            >
              <Text style={[styles.slotDialNum, { color: onCard }]}>
                {team.membersCount}
                <Text style={{ color: onCardFaint, fontSize: 13 }}>
                  /{team.capacity}
                </Text>
              </Text>
              <Text style={[styles.slotDialHint, { color: onCardFaint }]}>
                {slotsLeft === 0 ? 'plein' : slotsLeft === 1 ? '1 place' : `${slotsLeft} pl.`}
              </Text>
            </View>
          </View>

          <View style={styles.trackRow}>
            <View
              style={[
                styles.track,
                { backgroundColor: withHexAlpha(colors.ink, 0.08) },
              ]}
            >
              <LinearGradient
                colors={[accent, colors.primary]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={[styles.fill, { width: `${Math.max(progress * 100, 6)}%` }]}
              />
            </View>
          </View>

          {isPending ? (
            <View style={styles.actions}>
              <View
                style={[
                  styles.pendingBanner,
                  {
                    backgroundColor: withHexAlpha(accent, 0.08),
                    borderColor: withHexAlpha(accent, 0.3),
                  },
                ]}
              >
                <Icon name="pulse" size={15} color={accent} weight="bold" />
                <Text style={[styles.pending, { color: onCard }]}>
                  Demande envoyée — en attente de réponse
                </Text>
              </View>
              <Pressable
                style={[
                  styles.ghostBtn,
                  {
                    borderColor: colors.border,
                    backgroundColor: cardSurface,
                  },
                ]}
                onPress={onDetails}
                accessibilityLabel="Détails"
              >
                <Icon name="chevronRight" size={18} color={onCard} weight="bold" />
              </Pressable>
            </View>
          ) : (
            <View style={styles.actions}>
              <Pressable
                style={[styles.primaryBtn, { backgroundColor: 'transparent', overflow: 'hidden' }]}
                disabled={joinDisabled}
                onPress={onJoin}
              >
                <LinearGradient
                  colors={mine ? [accent, withHexAlpha(accent, 0.75)] : [...brand]}
                  start={brandAngle.start}
                  end={brandAngle.end}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.primaryBtnText, { color: '#fff' }]}>
                    {label}
                  </Text>
                )}
              </Pressable>
              <Pressable
                style={[
                  styles.ghostBtn,
                  {
                    borderColor: colors.border,
                    backgroundColor: cardSurface,
                  },
                ]}
                onPress={onDetails}
                accessibilityLabel="Détails"
              >
                <Icon name="chevronRight" size={18} color={onCard} weight="bold" />
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 22,
    marginBottom: spacing.md,
  },
  mineBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  vibeChip: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.38)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  mineBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: '#fff',
    letterSpacing: 0.3,
  },
  card: {
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  media: {
    height: ART_H,
    backgroundColor: '#EFF4FA',
    justifyContent: 'flex-end',
  },
  artImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    borderRadius: 0,
  },
  artFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaTop: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  mediaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  mediaChipMuted: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  mediaChipText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: '#fff',
    letterSpacing: 0.2,
  },
  mediaActivity: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: baseColors.ink,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingBottom: 18 + SHEET_OVERLAP * 0.35,
  },
  sheet: {
    marginTop: -SHEET_OVERLAP,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  grip: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 2,
  },
  accentRail: {
    position: 'absolute',
    left: 0,
    top: 28,
    bottom: 14,
    width: 3,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  sheetTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingLeft: 6,
  },
  sheetMain: {
    flex: 1,
    gap: 8,
    minWidth: 0,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 22,
    letterSpacing: -0.6,
    lineHeight: 26,
  },
  rankLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  rankDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  rankName: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  rankMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  placeCity: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  slotDial: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  slotDialNum: {
    fontFamily: fonts.displaySemi,
    fontSize: 18,
    letterSpacing: -0.4,
    lineHeight: 20,
  },
  slotDialHint: {
    fontFamily: fonts.body,
    fontSize: 10,
  },
  trackRow: {
    paddingLeft: 6,
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  pendingBanner: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pending: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    paddingLeft: 6,
  },
  primaryBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  primaryBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  ghostBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
