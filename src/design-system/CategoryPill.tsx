import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { UniverseId, getCategory } from '../constants/catalog';
import { Icon, universeIcon } from './Icon';
import { fonts, radii } from './tokens';

export function CategoryPill({
  universeId,
  label,
  color,
}: {
  universeId?: UniverseId;
  label: string;
  color?: string;
  /** @deprecated Les pastilles utilisent Phosphor via `universeId`. */
  emoji?: string;
}) {
  const cat = universeId ? getCategory(universeId) : undefined;
  const bg = color ?? cat?.color ?? '#0F8F8A';
  const name = universeId ? universeIcon(universeId) : 'spark';

  return (
    <View style={[styles.catPill, { backgroundColor: bg }]}>
      <Icon name={name} size={12} color="#fff" weight="bold" />
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
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  catPillText: {
    color: '#fff',
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.2,
  },
});
