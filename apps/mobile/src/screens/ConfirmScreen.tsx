import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { PrimaryButton } from '../components/PrimaryButton';
import { palette } from '../theme';
import { useBooking } from '../state/booking';
import { useAuth } from '../state/auth';
import { createAppointment } from '../api';

type Props = NativeStackScreenProps<RootStackParamList, 'Confirm'>;

export function ConfirmScreen({ navigation }: Props) {
  const { draft, createBooking } = useBooking();
  const { session } = useAuth();
  const serviceName = draft.serviceName ?? '-';
  const barberName = draft.barberName ?? '-';
  const requiresAuth = Boolean(
    process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  );
  const canConfirm = Boolean(
    draft.serviceId &&
      draft.barberId &&
      draft.date &&
      draft.slot &&
      (!requiresAuth || session)
  );
  const [error, setError] = useState<string | null>(null);

  return (
    <Screen>
      <Text style={styles.title}>Подтверждение записи</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Услуга</Text>
          <Text style={styles.value}>{serviceName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Мастер</Text>
          <Text style={styles.value}>{barberName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Дата</Text>
          <Text style={styles.value}>{draft.date ?? '-'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Время</Text>
          <Text style={styles.value}>{draft.slot ?? '-'}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          label="Подтвердить запись"
          onPress={async () => {
            if (!canConfirm) return;
            const startAt = `${draft.date}T${draft.slot}:00+03:00`;
            const result = await createAppointment({
              serviceId: draft.serviceId!,
              barberId: draft.barberId!,
              startAt
            });
            if (!result.ok) {
              setError(result.error ?? 'Ошибка записи');
              return;
            }
            createBooking(result.id);
            navigation.navigate('MyBookings');
          }}
        />
        <View style={{ marginTop: 10 }}>
          <PrimaryButton
            label="Изменить данные"
            variant="secondary"
            onPress={() => navigation.navigate('Services')}
          />
        </View>
      </View>
      {requiresAuth && !session ? (
        <Text style={styles.error}>Для онлайн-записи нужен вход в аккаунт.</Text>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
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
  footer: {
    marginTop: 24
  },
  error: {
    marginTop: 12,
    fontSize: 12,
    color: '#a93226'
  }
});
