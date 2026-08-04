import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

export type PickPhotoResult =
  | { ok: true; uri: string }
  | { ok: false; cancelled?: boolean; error?: string };

/**
 * Ouvre la bibliothèque, copie l’image dans le documentDirectory (persistant Expo Go).
 */
export async function pickAndPersistProfilePhoto(
  userId: string,
): Promise<PickPhotoResult> {
  if (!userId) {
    return { ok: false, error: 'Compte introuvable.' };
  }

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(
      'Accès photos',
      'Autorise l’accès à ta bibliothèque pour changer ta photo de profil.',
    );
    return { ok: false, error: 'Permission refusée.' };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });

  if (result.canceled || !result.assets?.[0]?.uri) {
    return { ok: false, cancelled: true };
  }

  const sourceUri = result.assets[0].uri;
  const base = FileSystem.documentDirectory;
  if (!base) {
    // Web / environnements sans FS : on garde l’URI picker (souvent blob/data).
    return { ok: true, uri: sourceUri };
  }

  try {
    const dir = `${base}avatars/`;
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
    const ext =
      sourceUri.includes('.png') || result.assets[0].mimeType === 'image/png'
        ? 'png'
        : 'jpg';
    const dest = `${dir}${userId.replace(/[^a-zA-Z0-9_-]/g, '_')}.${ext}`;
    await FileSystem.copyAsync({ from: sourceUri, to: dest });
    // Cache-bust pour forcer le refresh Image
    const bust = Platform.OS === 'web' ? dest : `${dest}?t=${Date.now()}`;
    return { ok: true, uri: bust };
  } catch {
    // Fallback : URI temporaire du picker (peut être volatile)
    return { ok: true, uri: sourceUri };
  }
}
