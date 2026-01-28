import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { palette } from '../theme';
import { barbers as demoBarbers } from '../data/demo';
import { useBooking } from '../state/booking';
import { listBarbers } from '../api';
import { Avatar } from '../components/Avatar';

type Props = NativeStackScreenProps<RootStackParamList, 'Barbers'>;

export function BarbersScreen({ navigation }: Props) {
  const { draft, setBarber } = useBooking();
  const [barbers, setBarbers] = useState(demoBarbers);
  const selectedServiceLabel = draft.serviceName;

  useEffect(() => {
    const loadBarbers = async () => {
      const data = await listBarbers();
      setBarbers(data);
    };
    loadBarbers();
  }, []);

  return (
    <Screen>
      <Text style={styles.title}>Выберите мастера</Text>
      {selectedServiceLabel ? (
        <Text style={styles.subtitle}>
          Услуга: {selectedServiceLabel}
        </Text>
      ) : null}
      <View style={styles.list}>
        {barbers.map((barber) => (
          <Pressable
            key={barber.id}
            style={styles.item}
            onPress={() => {
              setBarber(barber.id, barber.name);
              navigation.navigate('Calendar');
            }}
          >
            <View style={styles.left}>
              <Avatar
                name={barber.name}
                size={42}
                uri={barber.photoUrl ? barber.photoUrl : undefined}
              />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.name}>{barber.name}</Text>
                <Text style={styles.tag}>{barber.tag}</Text>
              </View>
            </View>
            <View style={styles.ratingChip}>
              <Text style={styles.ratingText}>{barber.rating.toFixed(1)}</Text>
            </View>
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
    color: palette.ink
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 12,
    color: palette.muted,
    fontSize: 13
  },
  list: {
    gap: 12,
    marginTop: 10
  },
  item: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.line,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: palette.ink
  },
  tag: {
    marginTop: 4,
    fontSize: 12,
    color: palette.muted
  },
  ratingChip: {
    backgroundColor: '#f3e0c9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b3a12'
  }
});
