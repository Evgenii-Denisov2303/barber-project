import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { Screen } from '../components/Screen';
import { palette } from '../theme';
import { useBooking } from '../state/booking';
import { cancelAppointment, listMyAppointments } from '../api';
import { useAuth } from '../state/auth';

export function MyBookingsScreen() {
  const { bookings, cancelBooking } = useBooking();
  const { session, signOut } = useAuth();
  const [remoteBookings, setRemoteBookings] = useState(bookings);

  const loadRemote = useCallback(async () => {
    if (!session) return;
    const data = await listMyAppointments();
      if (data) {
        setRemoteBookings(
          data.map((item) => ({
            id: item.id,
            serviceName: item.serviceName,
            barberName: item.barberName,
            date: item.date,
            time: item.time,
            status:
              item.status === 'cancelled'
                ? 'cancelled'
                : item.status === 'pending'
                  ? 'pending'
                  : 'confirmed'
          }))
        );
      }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      loadRemote();
    }, [loadRemote])
  );

  const list = session ? remoteBookings : bookings;

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Мои записи</Text>
        {session ? (
          <Pressable style={styles.signOut} onPress={signOut}>
            <Text style={styles.signOutText}>Выйти</Text>
          </Pressable>
        ) : null}
      </View>
      {list.length === 0 ? (
        <Text style={styles.empty}>Пока нет активных записей.</Text>
      ) : (
        <View style={styles.list}>
          {list.map((booking) => (
            <View key={booking.id} style={styles.card}>
              <View>
                <Text style={styles.cardTitle}>{booking.serviceName}</Text>
                <Text style={styles.cardMeta}>
                  {booking.date} · {booking.time}
                </Text>
                <Text style={styles.cardMeta}>Мастер: {booking.barberName}</Text>
                <Text style={styles.cardMeta}>
                  Статус: {booking.status === 'pending' ? 'ожидает' : booking.status === 'confirmed' ? 'подтверждено' : 'отменено'}
                </Text>
              </View>
              {booking.status !== 'cancelled' ? (
                <Pressable
                  style={styles.cancelButton}
                  onPress={async () => {
                    if (session) {
                      await cancelAppointment(booking.id);
                      loadRemote();
                    }
                    cancelBooking(booking.id);
                  }}
                >
                  <Text style={styles.cancelText}>Отменить</Text>
                </Pressable>
              ) : (
                <Text style={styles.cancelled}>Отменено</Text>
              )}
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: palette.ink
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  signOut: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.accent
  },
  signOutText: {
    fontSize: 12,
    color: palette.accent
  },
  empty: {
    marginTop: 12,
    fontSize: 13,
    color: palette.muted
  },
  list: {
    marginTop: 16,
    gap: 12
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.ink
  },
  cardMeta: {
    marginTop: 4,
    fontSize: 12,
    color: palette.muted
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.accent
  },
  cancelText: {
    fontSize: 12,
    color: palette.accent
  },
  cancelled: {
    fontSize: 12,
    color: palette.muted
  }
});
