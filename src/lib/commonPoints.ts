import {
  availabilities,
  categories,
  getCategory,
  platforms,
  vibes,
  type PlatformId,
  type UniverseId,
} from '../constants/catalog';
import type { IconName } from '../design-system/Icon';
import { resolveCatalogIcon } from '../design-system/Icon';
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
  /** Icône Phosphor sémantique */
  icon?: IconName;
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

function interestIcon(label: string): IconName {
  for (const cat of categories) {
    const sub = cat.subCategories.find(
      (s) => s.label.toLowerCase() === label.toLowerCase() || s.id === label.toLowerCase(),
    );
    if (sub) return resolveCatalogIcon(sub.id);
  }
  return 'interest';
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
      icon: resolveCatalogIcon(universeId),
    });
  }

  for (const interest of overlap(interestLabels(me), interestLabels(other))) {
    points.push({
      key: `interest:${interest.toLowerCase()}`,
      kind: 'interest',
      label: interest,
      icon: interestIcon(interest),
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
      icon: resolveCatalogIcon(platformId),
    });
  }

  for (const vibeId of overlap(me.vibes, other.vibes)) {
    const vibe = vibes.find((v) => v.id === vibeId);
    points.push({
      key: `vibe:${vibeId}`,
      kind: 'vibe',
      label: vibe?.label ?? vibeId,
      icon: resolveCatalogIcon(vibeId),
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
      icon: 'city',
    });
  }

  for (const slot of overlap(me.availability, other.availability)) {
    const avail = availabilities.find((a) => a.id === slot);
    points.push({
      key: `availability:${slot}`,
      kind: 'availability',
      label: avail?.label ?? slot,
      icon: resolveCatalogIcon(slot),
    });
  }

  return points;
}
