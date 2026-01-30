import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { PrimaryButton } from '../components/PrimaryButton';
import { palette } from '../theme';
import { useBooking } from '../state/booking';
import { cancelAppointment } from '../api';
import { useAuth } from '../state/auth';

type Props = NativeStackScreenProps<RootStackParamList, 'BookingDetail'>;

export function BookingDetailScreen({ route, navigation }: Props) {
  const { booking } = route.params;
  const { cancelBooking, startReschedule } = useBooking();
  const { session } = useAuth();
  const isCancelled = booking.status === 'cancelled';
  const canReschedule = Boolean(booking.serviceId && booking.barberId);

  return (
    <Screen>
      <Text style={styles.title}>Детали записи</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Услуга</Text>
          <Text style={styles.value}>{booking.serviceName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Мастер</Text>
          <Text style={styles.value}>{booking.barberName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Дата</Text>
          <Text style={styles.value}>{booking.date}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Время</Text>
          <Text style={styles.value}>{booking.time}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Статус</Text>
          <Text style={styles.value}>
            {booking.status === 'pending'
              ? 'ожидает'
              : booking.status === 'confirmed'
                ? 'подтверждено'
                : 'отменено'}
          </Text>
        </View>
      </View>

      {!isCancelled ? (
        <>
          <PrimaryButton
            label="Перенести запись"
            onPress={() => {
              if (!canReschedule) return;
              startReschedule(booking);
              navigation.navigate('Calendar');
            }}
            variant={canReschedule ? 'primary' : 'secondary'}
          />
          <View style={{ marginTop: 10 }}>
            <PrimaryButton
              label="Отменить запись"
              variant="secondary"
              onPress={async () => {
                if (session) {
                  await cancelAppointment(booking.id);
                }
                cancelBooking(booking.id);
                navigation.goBack();
              }}
            />
          </View>
        </>
      ) : null}

      {!canReschedule && !isCancelled ? (
        <Text style={styles.note}>
          Чтобы перенести запись, нужны данные мастера и услуги. Обновите список записей.
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: palette.ink
  },
  card: {
    marginTop: 16,
    backgroundColor: palette.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 16,
    gap: 10
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  label: {
    fontSize: 12,
    color: palette.muted
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.ink
  },
  note: {
    marginTop: 12,
    fontSize: 12,
    color: palette.muted
  }
});
