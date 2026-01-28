import { supabase } from './supabase';

const fallbackServices = [
  {
    id: 'demo-1',
    name: 'Мужская стрижка',
    durationMin: 60,
    price: 900,
    isActive: true
  },
  {
    id: 'demo-2',
    name: 'Стрижка машинкой',
    durationMin: 30,
    price: 500,
    isActive: true
  },
  {
    id: 'demo-3',
    name: 'Стрижка + борода',
    durationMin: 90,
    price: 1300,
    isActive: true
  },
  {
    id: 'demo-4',
    name: 'Оформление бороды',
    durationMin: 30,
    price: 500,
    isActive: true
  }
];

const fallbackBarbers = [
  { id: 'demo-1', name: 'Азамат Хусаинов', tag: 'Фейды и классика', rating: 4.8 },
  { id: 'demo-2', name: 'Рамиль Сафин', tag: 'Борода и форма', rating: 4.7 },
  { id: 'demo-3', name: 'Ильдар Галиуллин', tag: 'Быстрые стрижки', rating: 4.6 },
  { id: 'demo-4', name: 'Тимур Мухаметшин', tag: 'Сложные формы', rating: 4.9 }
];

const fallbackAppointments = [
  {
    id: 'demo-1',
    date: '2026-01-27',
    time: '12:30',
    client: 'Сергей М.',
    service: 'Стрижка + борода',
    barber: 'Азамат Хусаинов',
    status: 'подтверждено'
  },
  {
    id: 'demo-2',
    date: '2026-01-27',
    time: '14:00',
    client: 'Марсель Т.',
    service: 'Оформление бороды',
    barber: 'Рамиль Сафин',
    status: 'ожидает'
  },
  {
    id: 'demo-3',
    date: '2026-01-27',
    time: '16:00',
    client: 'Илья С.',
    service: 'Мужская стрижка',
    barber: 'Тимур Мухаметшин',
    status: 'подтверждено'
  }
];

export async function getServices() {
  if (!supabase) return fallbackServices;
  const { data, error } = await supabase
    .from('services')
    .select('id, name, duration_min, price, is_active')
    .order('name');
  if (error || !data) return fallbackServices;
  return data.map((item) => ({
    id: item.id,
    name: item.name,
    durationMin: item.duration_min,
    price: item.price,
    isActive: item.is_active
  }));
}

export async function getBarbers() {
  if (!supabase) return fallbackBarbers;
  const { data, error } = await supabase
    .from('barbers')
    .select('id, rating, bio, is_active, users(full_name)')
    .eq('is_active', true);
  if (error || !data) return fallbackBarbers;
  return data.map((item) => ({
    id: item.id,
    name: item.users?.full_name ?? 'Мастер',
    tag: item.bio ?? 'Барбер',
    rating: item.rating ?? 4.7
  }));
}

export async function getAppointments() {
  if (!supabase) return fallbackAppointments;
  const { data, error } = await supabase
    .from('appointments')
    .select('id, start_at, status, services(name), barbers(users(full_name))')
    .order('start_at', { ascending: true })
    .limit(10);
  if (error || !data) return fallbackAppointments;
  return data.map((item) => ({
    id: item.id,
    date: item.start_at ? item.start_at.slice(0, 10) : '',
    time: item.start_at ? item.start_at.slice(11, 16) : '--:--',
    client: 'Клиент',
    service: item.services?.name ?? 'Услуга',
    barber: item.barbers?.users?.full_name ?? 'Мастер',
    status: item.status === 'confirmed' ? 'подтверждено' : 'ожидает'
  }));
}
