import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

import { Screen } from '../components/Screen';
import { PrimaryButton } from '../components/PrimaryButton';
import { palette } from '../theme';
import { useAuth } from '../state/auth';

export function AuthScreen() {
  const { signIn, signUp, continueAsGuest, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const supabaseReady = Boolean(
    process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  );

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        <Text style={styles.title}>Вход в Istanbul</Text>
        <Text style={styles.subtitle}>
          Войдите, чтобы видеть свои записи и получать уведомления.
        </Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Имя</Text>
          <TextInput
            style={styles.input}
            placeholder="Ваше имя"
            placeholderTextColor={palette.muted}
            value={fullName}
            onChangeText={setFullName}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@email.com"
            placeholderTextColor={palette.muted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Пароль</Text>
          <TextInput
            style={styles.input}
            placeholder="Минимум 6 символов"
            placeholderTextColor={palette.muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        {!supabaseReady ? (
          <Text style={styles.error}>Supabase не настроен, доступен только гостевой режим.</Text>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton
          label="Войти"
          onPress={() => signIn(email, password)}
        />
        <View style={styles.spacer} />
        <PrimaryButton
          label="Создать аккаунт"
          variant="secondary"
          onPress={() => signUp(email, password, fullName)}
        />

        <View style={styles.guestBlock}>
          <Text style={styles.guestText}>
            Можно продолжить без входа — записи будут только в этом телефоне.
          </Text>
          <PrimaryButton
            label="Продолжить как гость"
            variant="secondary"
            onPress={continueAsGuest}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: palette.ink
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    color: palette.muted,
    marginBottom: 20
  },
  fieldGroup: {
    marginBottom: 14
  },
  label: {
    fontSize: 12,
    color: palette.muted,
    marginBottom: 6
  },
  input: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 12,
    padding: 12,
    color: palette.ink
  },
  error: {
    color: '#a93226',
    fontSize: 12,
    marginBottom: 10
  },
  spacer: {
    height: 10
  },
  guestBlock: {
    marginTop: 24,
    gap: 10
  },
  guestText: {
    fontSize: 12,
    color: palette.muted
  }
});
