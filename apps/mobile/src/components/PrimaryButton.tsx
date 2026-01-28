import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { palette } from '../theme';

type PrimaryButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
};

export function PrimaryButton({
  label,
  onPress,
  variant = 'primary'
}: PrimaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.button,
        variant === 'secondary' && styles.secondaryButton
      ]}
    >
      <Text
        style={[
          styles.label,
          variant === 'secondary' && styles.secondaryLabel
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: palette.accent,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center'
  },
  label: {
    color: '#fff7ef',
    fontWeight: '600'
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: palette.accent
  },
  secondaryLabel: {
    color: palette.accent
  }
});
