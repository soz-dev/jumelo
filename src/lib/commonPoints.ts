import {
  availabilities,
  categories,
  getCategory,
  platforms,
  vibes,
  type PlatformId,
  type UniverseId,
} from '../constants/catalog';
import type { UserProfile } from '../data/mock';

export type CommonPointKind =
  | 'universe'
  | 'interest'
  | 'platform'
  | 'vibe'
  | 'city'
  | 'availability';

export type CommonPoint = {
  key: string;
  kind: CommonPointKind;
  label: string;
  emoji?: string;
};

function overlap<T>(a: readonly T[], b: readonly T[]): T[] {
  const set = new Set(a);
  return b.filter((item) => set.has(item));
}

function subLabel(subId: string): string {
  for (const cat of categories) {
    const sub = cat.subCategories.find((s) => s.id === subId);
    if (sub) return sub.label;
  }
  return subId;
}

function interestLabels(profile: UserProfile): string[] {
  const fromSubs = (profile.subCategoryIds ?? []).map(subLabel);
  const merged = [...fromSubs, ...profile.interests];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const label of merged) {
    const normalized = label.trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
}

/**
 * Intersection lisible entre deux profils — preuves concrètes de match
 * (univers, hobbies, plateformes, vibes, ville, dispos).
 */
export function getCommonPoints(me: UserProfile, other: UserProfile): CommonPoint[] {
  const points: CommonPoint[] = [];

  for (const universeId of overlap(me.universes, other.universes) as UniverseId[]) {
    const cat = getCategory(universeId);
    points.push({
      key: `universe:${universeId}`,
      kind: 'universe',
      label: cat?.shortLabel ?? universeId,
      emoji: cat?.emoji,
    });
  }

  for (const interest of overlap(interestLabels(me), interestLabels(other))) {
    points.push({
      key: `interest:${interest.toLowerCase()}`,
      kind: 'interest',
      label: interest,
    });
  }

  const myPlatforms = me.platforms ?? [];
  const theirPlatforms = other.platforms ?? [];
  for (const platformId of overlap(myPlatforms, theirPlatforms) as PlatformId[]) {
    const plat = platforms.find((p) => p.id === platformId);
    points.push({
      key: `platform:${platformId}`,
      kind: 'platform',
      label: plat?.label ?? platformId,
      emoji: plat?.emoji,
    });
  }

  for (const vibeId of overlap(me.vibes, other.vibes)) {
    const vibe = vibes.find((v) => v.id === vibeId);
    points.push({
      key: `vibe:${vibeId}`,
      kind: 'vibe',
      label: vibe?.label ?? vibeId,
    });
  }

  if (
    me.city.trim() &&
    me.city.trim().toLowerCase() === other.city.trim().toLowerCase()
  ) {
    points.push({
      key: `city:${me.city.trim().toLowerCase()}`,
      kind: 'city',
      label: me.city.trim(),
    });
  }

  for (const slot of overlap(me.availability, other.availability)) {
    const avail = availabilities.find((a) => a.id === slot);
    points.push({
      key: `availability:${slot}`,
      kind: 'availability',
      label: avail?.label ?? slot,
    });
  }

  return points;
}
