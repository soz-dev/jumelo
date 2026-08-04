import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { fonts, radii, spacing } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

export function ThemeSwitcherButton({ size = 40 }: { size?: number }) {
  const { colors, palette, palettes, setThemeId, themeId } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityLabel="Changer le thème"
        style={[
          styles.btn,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.white,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={[styles.swatch, { backgroundColor: palette.primary }]} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.white }]} onPress={() => undefined}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.ink }]}>Thème</Text>
              <Pressable onPress={() => setOpen(false)}>
                <Ionicons name="close" size={22} color={colors.inkMuted} />
              </Pressable>
            </View>
            <Text style={[styles.sheetHint, { color: colors.inkMuted }]}>
              Choisis parmi 10 couleurs — enregistré dans tes préférences.
            </Text>
            <View style={styles.grid}>
              {palettes.map((item) => {
                const selected = item.id === themeId;
                return (
                  <Pressable
                    key={item.id}
                    onPress={async () => {
                      await setThemeId(item.id);
                      setOpen(false);
                    }}
                    style={[
                      styles.colorCell,
                      {
                        borderColor: selected ? item.primary : colors.border,
                        backgroundColor: colors.cream,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.colorDot,
                        {
                          backgroundColor: item.primary,
                          borderWidth: selected ? 3 : 0,
                          borderColor: colors.white,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.colorLabel,
                        {
                          color: colors.ink,
                          fontFamily: selected ? fonts.bodyBold : fonts.bodyMedium,
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  swatch: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(18,33,43,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sheetTitle: {
    fontFamily: fonts.displaySemi,
    fontSize: 22,
  },
  sheetHint: {
    fontFamily: fonts.body,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  grid: {
    gap: spacing.sm,
  },
  colorCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  colorLabel: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
  },
});
