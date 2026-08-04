import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { UniverseId, getCategory } from '../constants/catalog';
import { fonts, radii } from './tokens';

export function CategoryPill({
  universeId,
  label,
  color,
}: {
  universeId?: UniverseId;
  label: string;
  color?: string;
  emoji?: string;
}) {
  const cat = universeId ? getCategory(universeId) : undefined;
  const bg = color ?? cat?.color ?? '#0F8F8A';
  const iconName = universeId
    ? ({
        gaming: 'game-controller',
        sports: 'barbell',
        education: 'book',
        music: 'musical-notes',
        hobbies: 'color-palette',
      } as const)[universeId]
    : 'sparkles';

  return (
    <View style={[styles.catPill, { backgroundColor: bg }]}>
      <Ionicons name={iconName} size={12} color="#fff" />
      <Text style={styles.catPillText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  catPillText: {
    color: '#fff',
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
});
