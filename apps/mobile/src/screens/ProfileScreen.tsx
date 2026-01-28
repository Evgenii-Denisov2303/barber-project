import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Screen } from '../components/Screen';
import { PrimaryButton } from '../components/PrimaryButton';
import { palette } from '../theme';
import { getMyProfile, updateMyPhone } from '../api';
import { useAuth } from '../state/auth';

export function ProfileScreen() {
  const { session, isGuest, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      setStatus(null);
      if (!session) {
        setLoading(false);
        return;
      }
      const profile = await getMyProfile();
      if (profile) {
        setFullName(profile.fullName);
        setEmail(profile.email);
        setPhone(formatPhoneDisplay(profile.phone ?? ''));
      }
      setLoading(false);
    };
    loadProfile();
  }, [session]);

  const save = async () => {
    setStatus(null);
    if (!session) {
      setStatus('Войдите, чтобы сохранить номер телефона.');
      return;
    }
    const normalized = normalizePhoneForSave(phone);
    if (normalized === null) {
      setStatus('Введите корректный номер телефона');
      return;
    }
    const result = await updateMyPhone(normalized);
    if (!result.ok) {
      setStatus(result.error ?? 'Не удалось сохранить номер');
      return;
    }
    setPhone(formatPhoneDisplay(normalized));
    setStatus('Номер телефона сохранён');
  };

  return (
    <Screen>
      <Text style={styles.title}>Профиль</Text>
      {loading ? (
        <Text style={styles.helper}>Загрузка...</Text>
      ) : null}

      {!session ? (
        <View style={styles.card}>
          <Text style={styles.helper}>Войдите, чтобы указать номер телефона.</Text>
          {isGuest ? (
            <Text style={styles.helper}>Вы сейчас в гостевом режиме.</Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.card}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Имя</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              editable={false}
              placeholderTextColor={palette.muted}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              editable={false}
              placeholderTextColor={palette.muted}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Телефон (для SMS)</Text>
            <TextInput
              style={styles.input}
              placeholder="+7 900 000-00-00"
              placeholderTextColor={palette.muted}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>
          <PrimaryButton label="Сохранить" onPress={save} />
          <View style={{ marginTop: 10 }}>
            <PrimaryButton
              label="Выйти"
              variant="secondary"
              onPress={signOut}
            />
          </View>
        </View>
      )}

      <Text style={styles.note}>
        Этот номер используется для SMS-подтверждений и напоминаний.
      </Text>
      {status ? <Text style={styles.status}>{status}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: palette.ink
  },
  helper: {
    marginTop: 8,
    fontSize: 12,
    color: palette.muted
  },
  card: {
    marginTop: 16,
    backgroundColor: palette.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 16,
    gap: 12
  },
  fieldGroup: {
    gap: 6
  },
  label: {
    fontSize: 12,
    color: palette.muted
  },
  input: {
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 12,
    padding: 12,
    color: palette.ink
  },
  note: {
    marginTop: 16,
    fontSize: 12,
    color: palette.muted
  },
  status: {
    marginTop: 10,
    fontSize: 12,
    color: '#a93226'
  }
});

function normalizePhoneForSave(value: string) {
  const digits = value.replace(/[^\d]/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `+7${digits}`;
  if (digits.length === 11 && digits.startsWith('8')) return `+7${digits.slice(1)}`;
  if (digits.length === 11 && digits.startsWith('7')) return `+${digits}`;
  return null;
}

function formatPhoneDisplay(value: string) {
  const digits = value.replace(/[^\d]/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `+7${digits}`;
  if (digits.length === 11 && digits.startsWith('8')) return `+7${digits.slice(1)}`;
  if (digits.length === 11 && digits.startsWith('7')) return `+${digits}`;
  return value;
}
