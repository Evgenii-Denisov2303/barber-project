import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { PrimaryButton } from '../components/PrimaryButton';
import { palette } from '../theme';
import { barbers, getSlotsForDate } from '../data/demo';
import { useBooking } from '../state/booking';
import { listAvailability } from '../api';

type Props = NativeStackScreenProps<RootStackParamList, 'Slots'>;

export function SlotsScreen({ navigation }: Props) {
  const { draft, setSlot } = useBooking();
  const barber =
    barbers.find((item) => item.id === draft.barberId) ??
    (draft.barberName ? { name: draft.barberName } : undefined);
  const [slots, setSlots] = useState<string[]>([]);

  useEffect(() => {
    const loadSlots = async () => {
      if (!draft.date || !draft.serviceId) {
        setSlots(getSlotsForDate(draft.barberId));
        return;
      }
      const data = await listAvailability(
        draft.date,
        draft.serviceId,
        draft.barberId
      );
      setSlots(data);
    };
    loadSlots();
  }, [draft.date, draft.serviceId, draft.barberId]);

  return (
    <Screen>
      <Text style={styles.title}>Выберите время</Text>
      <Text style={styles.subtitle}>
        {draft.date ?? 'Дата не выбрана'} · {barber?.name ?? 'Мастер не выбран'}
      </Text>
      {slots.length === 0 ? (
        <Text style={styles.empty}>Нет свободных слотов на выбранную дату.</Text>
      ) : (
        <View style={styles.grid}>
          {slots.map((slot) => (
            <Pressable
              key={slot}
              style={[styles.slot, draft.slot === slot && styles.slotActive]}
              onPress={() => setSlot(slot)}
            >
              <Text
                style={[
                  styles.slotText,
                  draft.slot === slot && styles.slotTextActive
                ]}
              >
                {slot}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      <View style={styles.footer}>
        <PrimaryButton
          label="Продолжить"
          onPress={() => navigation.navigate('Confirm')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: palette.ink
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 16,
    fontSize: 13,
    color: palette.muted
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  empty: {
    fontSize: 13,
    color: palette.muted,
    marginTop: 10
  },
  slot: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface
  },
  slotActive: {
    backgroundColor: palette.accentDark,
    borderColor: palette.accentDark
  },
  slotText: {
    fontSize: 13,
    color: palette.ink
  },
  slotTextActive: {
    color: '#f8e6cf',
    fontWeight: '600'
  },
  footer: {
    marginTop: 24
  }
});
