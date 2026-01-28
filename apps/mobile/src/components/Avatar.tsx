import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { palette } from '../theme';

function initials(name: string) {
  const parts = name.split(' ').filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const second = parts[1]?.[0] ?? '';
  return `${first}${second}`.toUpperCase();
}

function colorFromName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 45%, 70%)`;
}

type AvatarProps = {
  name: string;
  size?: number;
  uri?: string;
};

export function Avatar({ name, size = 44, uri }: AvatarProps) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[
          styles.image,
          { width: size, height: size, borderRadius: size / 2 }
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
        { backgroundColor: colorFromName(name) }
      ]}
    >
      <Text style={styles.text}>{initials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.line
  },
  image: {
    borderWidth: 1,
    borderColor: palette.line
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.ink
  }
});
