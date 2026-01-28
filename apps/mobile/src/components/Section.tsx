import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { palette } from '../theme';

type SectionProps = {
  title: string;
  actionText?: string;
  onAction?: () => void;
  children: React.ReactNode;
};

export function Section({ title, actionText, onAction, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {actionText ? (
          <Pressable onPress={onAction}>
            <Text style={styles.sectionAction}>{actionText}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 24
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: palette.ink
  },
  sectionAction: {
    fontSize: 14,
    color: palette.accent
  }
});
