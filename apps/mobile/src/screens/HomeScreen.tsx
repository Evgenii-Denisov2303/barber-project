import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../navigation/types';
import { Section } from '../components/Section';
import { PrimaryButton } from '../components/PrimaryButton';
import { Screen } from '../components/Screen';
import { Avatar } from '../components/Avatar';
import { barbers, quickSlots, reviews, services } from '../data/demo';
import { palette } from '../theme';
import { useBooking } from '../state/booking';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const fade = useRef(new Animated.Value(0)).current;
  const shift = useRef(new Animated.Value(12)).current;
  const { setService, setBarber } = useBooking();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true
      }),
      Animated.timing(shift, {
        toValue: 0,
        duration: 450,
        useNativeDriver: true
      })
    ]).start();
  }, [fade, shift]);

  return (
    <Screen>
      <Animated.View style={{ opacity: fade, transform: [{ translateY: shift }] }}>
        <View style={styles.hero}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Istanbul · Казань</Text>
          </View>
          <Text style={styles.title}>Запись на стрижку за 1 минуту</Text>
          <Text style={styles.subtitle}>
            Выберите мастера и удобное время без звонков и ожидания.
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>Рейтинг 4.4 · 66 оценок</Text>
            <Text style={styles.metaText}>Открыто до 22:00</Text>
          </View>
          <PrimaryButton
            label="Записаться"
            onPress={() => navigation.navigate('Services')}
          />
          <View style={{ marginTop: 10 }}>
            <PrimaryButton
              label="Быстрая запись"
              variant="secondary"
              onPress={() => {
                const firstService = services[0];
                if (firstService) {
                  setService(firstService.id, firstService.name);
                  setBarber('first', 'Первый свободный');
                  navigation.navigate('Calendar');
                } else {
                  navigation.navigate('Services');
                }
              }}
            />
          </View>
        </View>

        <Section title="Быстрая запись" actionText="Все слоты">
          <View style={styles.slotRow}>
            {quickSlots.map((slot) => (
              <View key={slot} style={styles.slotPill}>
                <Text style={styles.slotText}>{slot}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section
          title="Услуги"
          actionText="Все услуги"
          onAction={() => navigation.navigate('Services')}
        >
          <View style={styles.cardGrid}>
            {services.slice(0, 4).map((service) => (
              <View key={service.id} style={styles.card}>
                <Text style={styles.cardTitle}>{service.name}</Text>
                <Text style={styles.cardMeta}>
                  {service.durationMin} мин · {service.price} ₽
                </Text>
              </View>
            ))}
          </View>
        </Section>

        <Section
          title="Мастера"
          actionText="Все мастера"
          onAction={() => navigation.navigate('Barbers')}
        >
          <View style={styles.list}>
            {barbers.slice(0, 3).map((barber) => (
              <View key={barber.id} style={styles.listItem}>
                <View style={styles.listLeft}>
                  <Avatar
                    name={barber.name}
                    size={42}
                    uri={barber.photoUrl ? barber.photoUrl : undefined}
                  />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.listTitle}>{barber.name}</Text>
                    <Text style={styles.listSubtitle}>{barber.tag}</Text>
                  </View>
                </View>
                <View style={styles.ratingChip}>
                  <Text style={styles.ratingText}>{barber.rating.toFixed(1)}</Text>
                </View>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Отзывы" actionText="Все отзывы">
          <View style={styles.reviewList}>
            {reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewName}>{review.name}</Text>
                  <Text style={styles.reviewDate}>{review.date}</Text>
                </View>
                <Text style={styles.reviewText}>{review.text}</Text>
              </View>
            ))}
          </View>
        </Section>

        <View style={styles.infoBlock}>
          <Text style={styles.infoTitle}>Адрес</Text>
          <Text style={styles.infoText}>Роторная ул., 27Е, Казань</Text>
          <Text style={styles.infoText}>+7 (986) 901-23-98</Text>
        </View>
        <View style={styles.bottomAction}>
          <PrimaryButton
            label="Мои записи"
            variant="secondary"
            onPress={() => navigation.navigate('MyBookings')}
          />
          <View style={{ marginTop: 10 }}>
            <PrimaryButton
              label="Профиль"
              variant="secondary"
              onPress={() => navigation.navigate('Profile')}
            />
          </View>
        </View>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: palette.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: palette.line
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: palette.accentDark,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999
  },
  badgeText: {
    color: '#f8e6cf',
    fontSize: 12,
    letterSpacing: 0.5
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 12,
    color: palette.ink
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: palette.muted,
    lineHeight: 20
  },
  metaRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  metaText: {
    fontSize: 12,
    color: palette.muted
  },
  slotRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  slotPill: {
    backgroundColor: palette.accentDark,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999
  },
  slotText: {
    color: '#f8e6cf',
    fontSize: 12
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  card: {
    width: '48%',
    backgroundColor: palette.surface,
    borderRadius: 16,
    padding: 12,
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
  },
  list: {
    gap: 10
  },
  listItem: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.line,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  listLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.ink
  },
  listSubtitle: {
    fontSize: 12,
    color: palette.muted,
    marginTop: 4
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
  },
  reviewList: {
    gap: 12
  },
  reviewCard: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 14
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  reviewName: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.ink
  },
  reviewDate: {
    fontSize: 11,
    color: palette.muted
  },
  reviewText: {
    marginTop: 8,
    fontSize: 12,
    color: palette.muted
  },
  infoBlock: {
    marginTop: 28,
    padding: 16,
    borderRadius: 18,
    backgroundColor: palette.sand
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.ink
  },
  infoText: {
    marginTop: 4,
    fontSize: 12,
    color: palette.muted
  },
  bottomAction: {
    marginTop: 16
  }
});
