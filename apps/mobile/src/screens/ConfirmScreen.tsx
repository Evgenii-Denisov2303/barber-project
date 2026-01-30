import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { PrimaryButton } from '../components/PrimaryButton';
import { palette } from '../theme';
import { useBooking } from '../state/booking';
import { useAuth } from '../state/auth';
import { createAppointment, rescheduleAppointment } from '../api';

type Props = NativeStackScreenProps<RootStackParamList, 'Confirm'>;

export function ConfirmScreen({ navigation }: Props) {
  const { draft, createBooking, rescheduleTarget, clearReschedule, applyReschedule } = useBooking();
  const { session } = useAuth();
  const isReschedule = Boolean(rescheduleTarget);
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
      <Text style={styles.title}>
        {isReschedule ? 'Перенос записи' : 'Подтверждение записи'}
      </Text>
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
          label={isReschedule ? 'Перенести запись' : 'Подтвердить запись'}
          onPress={async () => {
            if (!canConfirm) return;
            const startAt = `${draft.date}T${draft.slot}:00+03:00`;
            if (isReschedule && rescheduleTarget) {
              if (session) {
                const result = await rescheduleAppointment(rescheduleTarget.id, startAt);
            if (!result.ok) {
              setError(formatRpcError(result.error ?? 'Ошибка переноса'));
              return;
            }
              } else {
                applyReschedule(rescheduleTarget.id, draft.date!, draft.slot!);
              }
              clearReschedule();
              navigation.navigate('MyBookings');
              return;
            }
            const result = await createAppointment({
              serviceId: draft.serviceId!,
              barberId: draft.barberId!,
              startAt
            });
            if (!result.ok) {
              setError(formatRpcError(result.error ?? 'Ошибка записи'));
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

function formatRpcError(message: string) {
  if (message.includes('slot_taken')) {
    return 'Слот уже занят, выберите другое время';
  }
  if (message.includes('outside_working_hours')) {
    return 'Время вне рабочего графика';
  }
  if (message.includes('barber_unavailable')) {
    return 'У мастера выходной или перерыв';
  }
  if (message.includes('service_not_found')) {
    return 'Услуга не найдена';
  }
  return message;
}
