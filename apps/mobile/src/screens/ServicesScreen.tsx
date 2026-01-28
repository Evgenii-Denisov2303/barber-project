import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { palette } from '../theme';
import { services as demoServices } from '../data/demo';
import { useBooking } from '../state/booking';
import { listServices } from '../api';

type Props = NativeStackScreenProps<RootStackParamList, 'Services'>;

export function ServicesScreen({ navigation }: Props) {
  const { setService } = useBooking();
  const [services, setServices] = useState(demoServices);

  useEffect(() => {
    const loadServices = async () => {
      const data = await listServices();
      setServices(data);
    };
    loadServices();
  }, []);

  return (
    <Screen>
      <Text style={styles.title}>Выберите услугу</Text>
      <View style={styles.grid}>
        {services.filter((service) => service.isActive ?? true).map((service) => (
          <Pressable
            key={service.id}
            style={styles.card}
            onPress={() => {
              setService(service.id, service.name);
              navigation.navigate('Barbers');
            }}
          >
            <Text style={styles.cardTitle}>{service.name}</Text>
            <Text style={styles.cardMeta}>
              {service.durationMin} мин · {service.price} ₽
            </Text>
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
    marginBottom: 16,
    color: palette.ink
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  card: {
    width: '48%',
    backgroundColor: palette.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.line
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.ink
  },
  cardMeta: {
    marginTop: 6,
    fontSize: 12,
    color: palette.muted
  }
});
