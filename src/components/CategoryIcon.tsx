import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { UniverseId, getCategory } from '../constants/catalog';
import { Icon, universeIcon } from '../design-system/Icon';
import { radii } from '../constants/theme';

/** Extrémité sombre du dégradé pour chaque univers */
const gradientEnds: Record<UniverseId, string> = {
  gaming: '#5B3FD4',
  sports: '#0A6B67',
  education: '#1D4ED8',
  music: '#D97706',
  hobbies: '#BE185D',
};

export function CategoryIcon({
  universeId,
  size = 44,
}: {
  universeId: UniverseId;
  size?: number;
}) {
  const cat = getCategory(universeId);
  const start = cat?.color ?? '#0F8F8A';
  const end = gradientEnds[universeId] ?? '#0A6B67';

  return (
    <LinearGradient
      colors={[start, end]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: size * 0.28,
        },
      ]}
    >
      <Icon
        name={universeIcon(universeId)}
        size={size * 0.48}
        color="#fff"
        weight="bold"
      />
    </LinearGradient>
  );
}

export function CategoryBadge({
  universeId,
}: {
  universeId: UniverseId;
  label?: string;
}) {
  const cat = getCategory(universeId);
  const start = cat?.color ?? '#0F8F8A';
  const end = gradientEnds[universeId] ?? '#0A6B67';

  return (
    <LinearGradient
      colors={[start, end]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.badge}
    >
      <Icon name={universeIcon(universeId)} size={12} color="#fff" weight="bold" />
      <View style={{ width: 4 }} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
});
