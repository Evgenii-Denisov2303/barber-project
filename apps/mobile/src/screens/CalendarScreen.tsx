import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { palette } from '../theme';
import { useBooking } from '../state/booking';

const formatter = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'short',
  day: '2-digit',
  month: 'short'
});

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

type Props = NativeStackScreenProps<RootStackParamList, 'Calendar'>;

export function CalendarScreen({ navigation }: Props) {
  const { setDate } = useBooking();
  const days = useMemo(() => {
    const list: { label: string; value: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 7; i += 1) {
      const date = new Date(now);
      date.setDate(now.getDate() + i);
      list.push({
        label: formatter.format(date),
        value: formatDateValue(date)
      });
    }
    return list;
  }, []);

  return (
    <Screen>
      <Text style={styles.title}>Выберите дату</Text>
      <View style={styles.list}>
        {days.map((day) => (
          <Pressable
            key={day.value}
            style={styles.dayCard}
            onPress={() => {
              setDate(day.value);
              navigation.navigate('Slots');
            }}
          >
            <Text style={styles.dayLabel}>{day.label}</Text>
            <Text style={styles.dayValue}>{day.value}</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: palette.ink,
    marginBottom: 16
  },
  list: {
    gap: 12
  },
  dayCard: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.line
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.ink,
    textTransform: 'capitalize'
  },
  dayValue: {
    marginTop: 6,
    fontSize: 12,
    color: palette.muted
  }
});
