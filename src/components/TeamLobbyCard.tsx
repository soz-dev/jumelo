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
  mixHex,
  spacing,
  themeBrandColors,
  themeGradientAngles,
  universeIcon,
  withHexAlpha,
} from '../design-system';
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

type Props = {
  team: Team;
  state: TeamMembershipState;
  busy: boolean;
  onJoin: () => void;
  onDetails: () => void;
  duoRank?: DuoRankSnapshot | null;
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
}: Props) {
  const { colors } = useTheme();
  const cat = getCategory(team.universe);
  const accent = cat?.color ?? colors.primary;
  const progress = Math.min(1, team.membersCount / team.capacity);
  const slotsLeft = Math.max(0, team.capacity - team.membersCount);
  const label = joinLabel(state, team.locked, team.capacity);
  const joinDisabled = state === 'pending' || busy;

  /**
   * Panneau harmonisé charte bleue :
   * primaryDark approfondi → lift soft (dégradé, pas de plaque plate).
   */
  const sheet = mixHex(colors.primaryDark, '#061428', 0.42);
  const sheetMid = mixHex(sheet, colors.primary, 0.22);
  const sheetLift = mixHex(sheet, colors.primarySoft, 0.18);
  const onSheet = colors.cream;
  const onSheetMuted = withHexAlpha(colors.cream, 0.68);
  const onSheetFaint = withHexAlpha(colors.cream, 0.42);
  const brand = themeBrandColors(colors);
  const brandAngle = themeGradientAngles.brand;

  const primaryPending = state === 'pending';
  const primaryFg = primaryPending ? onSheetMuted : '#fff';

  return (
    <View style={[styles.shell, elevation.soft]}>
      <View style={styles.card}>
        {/* Header media — inchangé (top) */}
        <View style={styles.media}>
          <CardArt team={team} accent={accent} />
          <LinearGradient
            colors={['transparent', 'rgba(15,18,24,0.55)']}
            locations={[0.35, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={styles.mediaTop}>
            <View style={styles.mediaChip}>
              <Icon
                name={team.locked ? 'lock' : 'lock-open'}
                size={11}
                color="#fff"
                weight="bold"
              />
              <Text style={styles.mediaChipText}>
                {team.locked ? 'Sur demande' : 'Ouvert'}
              </Text>
            </View>
            {team.vibe ? (
              <View style={styles.mediaChipMuted}>
                <Text style={styles.mediaChipText}>{team.vibe}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.mediaActivity} numberOfLines={1}>
            {team.activity}
          </Text>
        </View>

        {/* Sheet qui remonte sur l’art */}
        <View style={styles.sheet}>
          <LinearGradient
            colors={[sheet, sheetMid, sheetLift]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={[styles.grip, { backgroundColor: withHexAlpha(onSheet, 0.22) }]} />
          <View style={[styles.accentRail, { backgroundColor: accent }]} />

          <View style={styles.sheetTop}>
            <View style={styles.sheetMain}>
              <Text style={[styles.title, { color: onSheet }]} numberOfLines={2}>
                {team.name}
              </Text>

              {duoRank ? (
                <View style={styles.rankLine}>
                  <View style={[styles.rankDot, { backgroundColor: duoRank.color }]} />
                  <Text style={[styles.rankName, { color: duoRank.color }]}>
                    {duoRank.displayName}
                  </Text>
                  <Text style={[styles.rankMeta, { color: onSheetFaint }]}>
                    Nv.{duoRank.level}
                  </Text>
                  <Text style={[styles.rankMeta, { color: onSheetFaint }]}>·</Text>
                  <Text
                    style={[styles.rankMeta, { color: onSheetMuted, flex: 1 }]}
                    numberOfLines={1}
                  >
                    {duoRank.title}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.rankMeta, { color: onSheetMuted }]}>
                  Niveau · {team.levelLabel}
                </Text>
              )}

              <View style={styles.placeRow}>
                <Icon name="city" size={13} color={onSheetFaint} />
                <Text style={[styles.placeCity, { color: onSheetMuted }]}>
                  {team.city}
                </Text>
                {team.nextSession && team.nextSession !== 'À définir' ? (
                  <>
                    <Text style={{ color: onSheetFaint }}>·</Text>
                    <Text
                      style={[styles.placeCity, { color: onSheetFaint, flex: 1 }]}
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
                  borderColor: withHexAlpha(accent, 0.55),
                  backgroundColor: sheetLift,
                },
              ]}
            >
              <Text style={[styles.slotDialNum, { color: onSheet }]}>
                {team.membersCount}
                <Text style={{ color: onSheetFaint, fontSize: 13 }}>
                  /{team.capacity}
                </Text>
              </Text>
              <Text style={[styles.slotDialHint, { color: onSheetFaint }]}>
                {slotsLeft === 0 ? 'plein' : slotsLeft === 1 ? '1 place' : `${slotsLeft} pl.`}
              </Text>
            </View>
          </View>

          <View style={styles.trackRow}>
            <View
              style={[
                styles.track,
                { backgroundColor: withHexAlpha(onSheet, 0.12) },
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

          {state === 'pending' ? (
            <Text style={[styles.pending, { color: colors.primaryLight }]}>
              Demande envoyée — en attente du chef
            </Text>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              style={[
                styles.primaryBtn,
                primaryPending
                  ? { backgroundColor: withHexAlpha(colors.cream, 0.14) }
                  : { backgroundColor: 'transparent', overflow: 'hidden' },
              ]}
              disabled={joinDisabled && state === 'pending'}
              onPress={onJoin}
            >
              {!primaryPending ? (
                <LinearGradient
                  colors={[...brand]}
                  start={brandAngle.start}
                  end={brandAngle.end}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />
              ) : null}
              {busy ? (
                <ActivityIndicator color={primaryFg} />
              ) : (
                <Text style={[styles.primaryBtnText, { color: primaryFg }]}>
                  {label}
                </Text>
              )}
            </Pressable>
            <Pressable
              style={[
                styles.ghostBtn,
                {
                  borderColor: withHexAlpha(onSheet, 0.2),
                  backgroundColor: sheetLift,
                },
              ]}
              onPress={onDetails}
              accessibilityLabel="Détails"
            >
              <Icon name="chevronRight" size={18} color={onSheet} weight="bold" />
            </Pressable>
          </View>
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
  card: {
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#12151A',
  },
  media: {
    height: ART_H,
    backgroundColor: '#12151A',
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
    color: 'rgba(255,255,255,0.92)',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingBottom: 12 + SHEET_OVERLAP * 0.35,
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
  pending: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    paddingLeft: 6,
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
