import { supabase } from '../lib/supabase';
import {
  barbers as demoBarbers,
  getSlotsForDate,
  services as demoServices
} from '../data/demo';

type RemoteBooking = {
  id: string;
  serviceId: string;
  barberId: string;
  date: string;
  time: string;
  serviceName: string;
  barberName: string;
  status: 'confirmed' | 'cancelled' | 'pending';
};

type UserProfile = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
};

const hasSupabase = Boolean(supabase);

export async function listServices() {
  if (!hasSupabase) return demoServices;
  const { data, error } = await supabase!
    .from('services')
    .select('id, name, duration_min, price, is_active')
    .eq('is_active', true)
    .order('name');
  if (error || !data) return demoServices;
  return data.map((item) => ({
    id: item.id,
    name: item.name,
    durationMin: item.duration_min,
    price: item.price,
    isActive: item.is_active
  }));
}

export async function listBarbers(serviceId?: string) {
  if (!hasSupabase) return demoBarbers;
  if (serviceId) {
    const { data, error } = await supabase!
      .from('barbers')
      .select('id, rating, bio, photo_url, is_active, users(full_name), barber_services!inner(service_id)')
      .eq('is_active', true)
      .eq('barber_services.service_id', serviceId);
    if (error || !data) return demoBarbers;
    return data.map((item) => ({
      id: item.id,
      name: item.users?.full_name ?? 'Мастер',
      rating: item.rating ?? 4.7,
      tag: item.bio ?? 'Барбер',
      photoUrl: item.photo_url ?? ''
    }));
  }
  const { data, error } = await supabase!
    .from('barbers')
    .select('id, rating, bio, photo_url, is_active, users(full_name)')
    .eq('is_active', true);
  if (error || !data) return demoBarbers;
  return data.map((item) => ({
    id: item.id,
    name: item.users?.full_name ?? 'Мастер',
    rating: item.rating ?? 4.7,
    tag: item.bio ?? 'Барбер',
    photoUrl: item.photo_url ?? ''
  }));
}

export async function listAvailability(
  date: string,
  serviceId: string,
  barberId?: string
) {
  if (!hasSupabase || !barberId) return getSlotsForDate(barberId);
  const { data, error } = await supabase!.rpc('rpc_get_availability', {
    p_date: date,
    p_service_id: serviceId,
    p_barber_id: barberId
  });
  if (error || !data) return getSlotsForDate(barberId);
  return data.map((slot: { slot_start: string }) => slot.slot_start.slice(11, 16));
}

export async function createAppointment(payload: {
  serviceId: string;
  barberId: string;
  startAt: string;
}) {
  if (!hasSupabase) return { ok: true };
  const { data, error } = await supabase!.rpc('rpc_create_appointment', {
    p_service_id: payload.serviceId,
    p_barber_id: payload.barberId,
    p_start_at: payload.startAt
  });
  if (error) return { ok: false, error: error.message };
  if (data) {
    void notifyTelegram(data, 'created');
  }
  return { ok: true, id: data };
}

export async function listMyAppointments(): Promise<RemoteBooking[] | null> {
  if (!hasSupabase) return null;
  const { data: sessionData } = await supabase!.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return null;

  const { data, error } = await supabase!
    .from('appointments')
    .select('id, service_id, barber_id, start_at, status, services(name), barbers(users(full_name))')
    .eq('client_id', userId)
    .order('start_at', { ascending: true });
  if (error || !data) return null;

  return data.map((item) => ({
    id: item.id,
    serviceId: item.service_id,
    barberId: item.barber_id,
    date: item.start_at ? item.start_at.slice(0, 10) : '',
    time: item.start_at ? item.start_at.slice(11, 16) : '',
    serviceName: item.services?.name ?? 'Услуга',
    barberName: item.barbers?.users?.full_name ?? 'Мастер',
    status: item.status === 'cancelled' ? 'cancelled' : item.status === 'pending' ? 'pending' : 'confirmed'
  }));
}

export async function cancelAppointment(id: string) {
  if (!hasSupabase) return { ok: true };
  const { error } = await supabase!
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  void notifyTelegram(id, 'cancelled');
  return { ok: true };
}

export async function rescheduleAppointment(id: string, newStartAt: string) {
  if (!hasSupabase) return { ok: true };
  const { error } = await supabase!.rpc('rpc_reschedule_appointment', {
    p_appointment_id: id,
    p_new_start_at: newStartAt
  });
  if (error) return { ok: false, error: error.message };
  void notifyTelegram(id, 'rescheduled');
  return { ok: true };
}

export async function getMyProfile(): Promise<UserProfile | null> {
  if (!hasSupabase) return null;
  const { data: sessionData } = await supabase!.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return null;
  const { data, error } = await supabase!
    .from('users')
    .select('id, full_name, email, phone')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    fullName: data.full_name ?? 'Клиент',
    email: data.email ?? '',
    phone: data.phone ?? ''
  };
}

export async function updateMyPhone(phone: string) {
  if (!hasSupabase) return { ok: false, error: 'Supabase не настроен' };
  const { data: sessionData } = await supabase!.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return { ok: false, error: 'Нет активной сессии' };
  const cleaned = phone.trim();
  const { error } = await supabase!
    .from('users')
    .update({ phone: cleaned ? cleaned : null })
    .eq('id', userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

async function notifyTelegram(appointmentId: string, event: 'created' | 'rescheduled' | 'cancelled' | 'confirmed' | 'status') {
  if (!supabase) return;
  try {
    const { error } = await supabase.functions.invoke('notify-telegram', {
      body: { appointmentId, event }
    });
    if (error) {
      console.warn('notify-telegram', error.message);
    }
  } catch (err) {
    console.warn('notify-telegram', err);
  }
}
