import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import { RootStackParamList } from './src/navigation/types';
import { HomeScreen } from './src/screens/HomeScreen';
import { ServicesScreen } from './src/screens/ServicesScreen';
import { BarbersScreen } from './src/screens/BarbersScreen';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { SlotsScreen } from './src/screens/SlotsScreen';
import { ConfirmScreen } from './src/screens/ConfirmScreen';
import { MyBookingsScreen } from './src/screens/MyBookingsScreen';
import { BookingProvider } from './src/state/booking';
import { palette } from './src/theme';
import { AuthProvider, useAuth } from './src/state/auth';
import { AuthScreen } from './src/screens/AuthScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

function RootNavigator() {
  const { session, loading, isGuest } = useAuth();

  if (loading) {
    return (
      <NavigationContainer>
        <StatusBar style="dark" />
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: palette.bg },
            headerShadowVisible: false,
            headerTintColor: palette.ink,
            headerTitleStyle: { fontWeight: '600' }
          }}
        >
          <Stack.Screen name="Auth" component={AuthScreen} options={{ title: '' }} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: palette.bg },
          headerShadowVisible: false,
          headerTintColor: palette.ink,
          headerTitleStyle: { fontWeight: '600' }
        }}
      >
        {!session && !isGuest ? (
          <Stack.Screen
            name="Auth"
            component={AuthScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ title: 'Istanbul' }}
            />
            <Stack.Screen
              name="Services"
              component={ServicesScreen}
              options={{ title: 'Услуги' }}
            />
            <Stack.Screen
              name="Barbers"
              component={BarbersScreen}
              options={{ title: 'Мастера' }}
            />
            <Stack.Screen
              name="Calendar"
              component={CalendarScreen}
              options={{ title: 'Дата' }}
            />
            <Stack.Screen
              name="Slots"
              component={SlotsScreen}
              options={{ title: 'Время' }}
            />
            <Stack.Screen
              name="Confirm"
              component={ConfirmScreen}
              options={{ title: 'Подтверждение' }}
            />
            <Stack.Screen
              name="MyBookings"
              component={MyBookingsScreen}
              options={{ title: 'Мои записи' }}
            />
            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{ title: 'Профиль' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BookingProvider>
        <RootNavigator />
      </BookingProvider>
    </AuthProvider>
  );
}
