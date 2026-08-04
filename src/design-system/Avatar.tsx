import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import { fonts } from './tokens';

type AvatarProps = {
  name: string;
  color?: string;
  photo?: string | null;
  size?: number;
  online?: boolean;
};

export function Avatar({ name, color, photo, size = 48, online }: AvatarProps) {
  const { colors } = useTheme();
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const bg = color ?? colors.primary;

  return (
    <View style={{ width: size, height: size }}>
      {photo ? (
        <Image
          source={{ uri: photo }}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: bg,
          }}
        />
      ) : (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              color: colors.white,
              fontFamily: fonts.bodyBold,
              fontSize: size * 0.36,
            }}
          >
            {initials}
          </Text>
        </View>
      )}
      {online ? (
        <View
          style={[
            styles.dot,
            {
              width: size * 0.28,
              height: size * 0.28,
              borderRadius: size,
              backgroundColor: colors.online,
              borderColor: colors.white,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    borderWidth: 2,
  },
});
