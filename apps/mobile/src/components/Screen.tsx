import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { palette } from '../theme';

type ScreenProps = {
  children: React.ReactNode;
  padded?: boolean;
};

export function Screen({ children, padded = true }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={padded ? styles.container : undefined}>
        <View>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.bg
  },
  container: {
    padding: 20,
    paddingBottom: 40
  }
});
