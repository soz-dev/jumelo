import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { completeAuthSessionIfNeeded } from '../src/lib/completeAuthSession';

/**
 * Retour Google OAuth (popup web uniquement).
 * Ne doit afficher que ce placeholder — le parent ferme ensuite la fenêtre.
 */
export default function OAuthCallbackScreen() {
  useEffect(() => {
    completeAuthSessionIfNeeded();
  }, []);

  return (
    <View style={styles.root}>
      <ActivityIndicator color="#0186F0" size="large" />
      <Text style={styles.text}>Connexion en cours…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F4EF',
    gap: 16,
  },
  text: {
    fontSize: 16,
    color: '#1A1A1A',
  },
});
