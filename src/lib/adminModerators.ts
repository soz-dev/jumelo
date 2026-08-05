import AsyncStorage from '@react-native-async-storage/async-storage';

import { logAdminActivity } from './adminStore';

const MODS_KEY = '@jumelo/admin-moderators';

export type ModeratorPermissions = {
  /** Peut renommer un jumelo/groupe */
  canRenameTeam: boolean;
  /** Peut retirer la photo de profil d'un utilisateur */
  canRemovePhoto: boolean;
  /** Peut envoyer un avertissement dans le chat d'un joueur (comme "Jumelo-Modération") */
  canSendWarning: boolean;
};

export type Moderator = {
  uid: string;
  /** Surnom affiché dans le panel (optionnel) */
  label?: string;
  addedAt: string;
  addedBy: string;
  permissions: ModeratorPermissions;
};

const DEFAULT_PERMISSIONS: ModeratorPermissions = {
  canRenameTeam: false,
  canRemovePhoto: false,
  canSendWarning: false,
};

async function readMods(): Promise<Moderator[]> {
  try {
    const raw = await AsyncStorage.getItem(MODS_KEY);
    return raw ? (JSON.parse(raw) as Moderator[]) : [];
  } catch {
    return [];
  }
}

async function writeMods(mods: Moderator[]): Promise<void> {
  await AsyncStorage.setItem(MODS_KEY, JSON.stringify(mods));
}

export async function listModerators(): Promise<Moderator[]> {
  return readMods();
}

export async function addModerator(
  uid: string,
  adminUid: string,
  label?: string,
): Promise<{ ok: boolean; error?: string }> {
  const clean = uid.trim();
  if (!clean) return { ok: false, error: 'UID requis.' };
  const mods = await readMods();
  if (mods.find((m) => m.uid === clean)) {
    return { ok: false, error: 'Ce modérateur existe déjà.' };
  }
  mods.push({
    uid: clean,
    label: label?.trim() || undefined,
    addedAt: new Date().toISOString(),
    addedBy: adminUid,
    permissions: { ...DEFAULT_PERMISSIONS },
  });
  await writeMods(mods);
  await logAdminActivity('add_moderator', `uid:${clean}`);
  return { ok: true };
}

export async function removeModerator(uid: string): Promise<void> {
  const mods = await readMods();
  await writeMods(mods.filter((m) => m.uid !== uid));
  await logAdminActivity('remove_moderator', `uid:${uid}`);
}

export async function setModeratorPermission(
  uid: string,
  perm: keyof ModeratorPermissions,
  value: boolean,
): Promise<void> {
  const mods = await readMods();
  const mod = mods.find((m) => m.uid === uid);
  if (!mod) return;
  mod.permissions[perm] = value;
  await writeMods(mods);
  await logAdminActivity('mod_permission', `${uid} · ${perm}=${value}`);
}

export async function isModerator(uid: string): Promise<boolean> {
  const mods = await readMods();
  return mods.some((m) => m.uid === uid);
}

export async function getModeratorPermissions(
  uid: string,
): Promise<ModeratorPermissions | null> {
  const mods = await readMods();
  return mods.find((m) => m.uid === uid)?.permissions ?? null;
}
