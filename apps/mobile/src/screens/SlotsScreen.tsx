import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { PrimaryButton } from '../components/PrimaryButton';
import { palette } from '../theme';
import { barbers, getSlotsForDate } from '../data/demo';
import { useBooking } from '../state/booking';
import { listAvailability, listBarbers } from '../api';

type Props = NativeStackScreenProps<RootStackParamList, 'Slots'>;

export function SlotsScreen({ navigation }: Props) {
  const { draft, setSlot, setBarber, rescheduleTarget } = useBooking();
  const barber =
    barbers.find((item) => item.id === draft.barberId) ??
    (draft.barberName ? { name: draft.barberName } : undefined);
  const [slots, setSlots] = useState<string[]>([]);
  const [firstOptions, setFirstOptions] = useState<
    { time: string; barberId: string; barberName: string }[]
  >([]);
  const isFirstAvailable = draft.barberId === 'first';

  useEffect(() => {
    const loadSlots = async () => {
      if (!draft.date || !draft.serviceId) {
        setSlots(getSlotsForDate(draft.barberId));
        return;
      }
      if (isFirstAvailable) {
        const candidates = await listBarbers(draft.serviceId);
        const results = await Promise.all(
          candidates.map(async (candidate) => {
            const list = await listAvailability(
              draft.date!,
              draft.serviceId!,
              candidate.id
            );
            if (!list.length) return null;
            return {
              time: list[0],
              barberId: candidate.id,
              barberName: candidate.name
            };
          })
        );
        const available = results.filter(Boolean) as {
          time: string;
          barberId: string;
          barberName: string;
        }[];
        available.sort((a, b) => a.time.localeCompare(b.time));
        setFirstOptions(available);
        setSlots([]);
        return;
      }
      setFirstOptions([]);
      const data = await listAvailability(draft.date, draft.serviceId, draft.barberId);
      setSlots(data);
    };
    loadSlots();
  }, [draft.date, draft.serviceId, draft.barberId, isFirstAvailable]);

  return (
    <Screen>
      <Text style={styles.title}>
        {rescheduleTarget ? 'Выберите новое время' : 'Выберите время'}
      </Text>
      <Text style={styles.subtitle}>
        {draft.date ?? 'Дата не выбрана'} · {barber?.name ?? 'Мастер не выбран'}
      </Text>
      {isFirstAvailable ? (
        firstOptions.length === 0 ? (
          <Text style={styles.empty}>Нет свободных мастеров на выбранную дату.</Text>
        ) : (
          <View style={styles.grid}>
            {firstOptions.map((option) => (
              <Pressable
                key={`${option.barberId}-${option.time}`}
                style={styles.slot}
                onPress={() => {
                  setBarber(option.barberId, option.barberName);
                  setSlot(option.time);
                }}
              >
                <Text style={styles.slotText}>
                  {option.time} · {option.barberName}
                </Text>
              </Pressable>
            ))}
          </View>
        )
      ) : slots.length === 0 ? (
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
