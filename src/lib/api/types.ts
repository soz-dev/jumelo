import type {
  Availability,
  Level,
  PlatformId,
  UniverseId,
} from '../../constants/catalog';
import type { ThemeId } from '../../constants/theme';
import type { UserProfile } from '../../data/mock';
import { normalizeProfileVibes } from '../vibes';

export type ProfileRow = {
  id: string;
  name: string;
  email: string;
  city: string;
  bio: string;
  avatar_url: string | null;
  avatar_color: string;
  level: Level;
  /** Single id or comma-separated / JSON array of vibe ids. */
  vibe: string;
  reliability: number;
  theme_id: string;
  onboarding_complete: boolean;
  languages: string[] | null;
  /** Age in years (13–100), used by matching. */
  age?: number | null;
  created_at?: string;
  updated_at?: string;
};

export type ProfileRelations = {
  universes: UniverseId[];
  interests: string[];
  platforms: PlatformId[];
  availability: Availability[];
  objectives: string[];
};

export function mapProfileRow(
  row: ProfileRow,
  relations: Partial<ProfileRelations> = {},
): UserProfile {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    city: row.city,
    bio: row.bio,
    avatarColor: row.avatar_color || '#0186F0',
    photo: row.avatar_url ?? undefined,
    universes: relations.universes ?? [],
    interests: relations.interests ?? [],
    platforms: relations.platforms ?? [],
    level: row.level,
    vibes: normalizeProfileVibes({ vibe: row.vibe }),
    availability: relations.availability ?? [],
    objectives: relations.objectives ?? [],
    reliability: row.reliability,
    languages: row.languages ?? [],
    age:
      typeof row.age === 'number' && Number.isFinite(row.age) ? row.age : undefined,
    onboardingComplete: row.onboarding_complete,
    themeId: (row.theme_id as ThemeId) || 'teal',
    createdAt: row.created_at,
  };
}
