export const services = [
  {
    id: 'svc_1',
    name: 'Мужская стрижка',
    durationMin: 60,
    price: 900,
    isActive: true
  },
  {
    id: 'svc_2',
    name: 'Стрижка машинкой',
    durationMin: 30,
    price: 500,
    isActive: true
  },
  {
    id: 'svc_3',
    name: 'Стрижка + борода',
    durationMin: 90,
    price: 1300,
    isActive: true
  },
  {
    id: 'svc_4',
    name: 'Оформление бороды',
    durationMin: 30,
    price: 500,
    isActive: true
  },
  {
    id: 'svc_5',
    name: 'Детская стрижка',
    durationMin: 45,
    price: 700,
    isActive: true
  },
  {
    id: 'svc_6',
    name: 'Укладка',
    durationMin: 20,
    price: 300,
    isActive: true
  }
];

export const barbers = [
  {
    id: 'barber_1',
    name: 'Азамат Хусаинов',
    rating: 4.8,
    tag: 'Фейды и классика',
    photoUrl: ''
  },
  {
    id: 'barber_2',
    name: 'Рамиль Сафин',
    rating: 4.7,
    tag: 'Борода и форма',
    photoUrl: ''
  },
  {
    id: 'barber_3',
    name: 'Ильдар Галиуллин',
    rating: 4.6,
    tag: 'Быстрые стрижки',
    photoUrl: ''
  },
  {
    id: 'barber_4',
    name: 'Тимур Мухаметшин',
    rating: 4.9,
    tag: 'Сложные формы',
    photoUrl: ''
  }
];

export const quickSlots = ['10:00', '10:30', '11:00', '11:30', '12:00'];

export const reviews = [
  {
    id: 'rev-1',
    name: 'VinniGreat',
    date: '5 янв 2025',
    text: 'Отличная стрижка и сервис, быстро и аккуратно.'
  },
  {
    id: 'rev-2',
    name: 'Александра',
    date: '22 мая 2024',
    text: 'Удобно, что можно записаться онлайн и прийти всей семьёй.'
  },
  {
    id: 'rev-3',
    name: 'Инкогнито',
    date: '12 мая 2024',
    text: 'Клиентоориентированный персонал и бюджетные цены.'
  }
];

export const openingHours = { open: '10:00', close: '22:00' };

const busyByBarber: Record<string, string[]> = {
  barber_1: ['12:00', '14:30', '18:00'],
  barber_2: ['10:30', '13:00', '16:00'],
  barber_3: ['11:00', '15:30', '19:00'],
  barber_4: ['12:30', '17:00', '20:00']
};

export function formatPrice(price: number) {
  return `${price} ₽`;
}

export function getSlotsForDate(barberId?: string) {
  const [openHour, openMinute] = openingHours.open.split(':').map(Number);
  const [closeHour, closeMinute] = openingHours.close.split(':').map(Number);
  const slots: string[] = [];
  const start = openHour * 60 + openMinute;
  const end = closeHour * 60 + closeMinute;
  for (let minutes = start; minutes < end; minutes += 30) {
    const h = String(Math.floor(minutes / 60)).padStart(2, '0');
    const m = String(minutes % 60).padStart(2, '0');
    slots.push(`${h}:${m}`);
  }
  const busy = barberId ? busyByBarber[barberId] ?? [] : [];
  return slots.filter((slot) => !busy.includes(slot));
}
