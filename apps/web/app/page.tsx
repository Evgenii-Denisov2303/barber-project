'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '../lib/supabaseBrowser';

type StatItem = { label: string; value: string };
type UpcomingItem = { time: string; client: string; service: string; label: string };

const demoStats: StatItem[] = [
  { label: 'Сегодня записей', value: '14' },
  { label: 'Свободные слоты', value: '6' },
  { label: 'Новые клиенты', value: '3' }
];

const demoUpcoming: UpcomingItem[] = [
  { time: '12:30', client: 'Сергей М.', service: 'Стрижка + борода', label: 'демо' },
  { time: '13:30', client: 'Илья С.', service: 'Мужская стрижка', label: 'демо' },
  { time: '15:00', client: 'Айрат Н.', service: 'Оформление бороды', label: 'демо' }
];

const buildDayLabel = (date: Date) => {
  const today = new Date();
  const sameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
  if (sameDay) return 'сегодня';
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
};

export default function Page() {
  const [stats, setStats] = useState<StatItem[]>(demoStats);
  const [upcoming, setUpcoming] = useState<UpcomingItem[]>(demoUpcoming);
  const [demoMode, setDemoMode] = useState(true);

  useEffect(() => {
    if (!supabaseBrowser) return;

    const load = async () => {
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) {
        setDemoMode(true);
        setStats(demoStats);
        setUpcoming(demoUpcoming);
        return;
      }

      const { data: roleData } = await supabaseBrowser
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();
      const role = roleData?.role;
      if (role !== 'admin' && role !== 'barber') {
        setDemoMode(true);
        setStats(demoStats);
        setUpcoming(demoUpcoming);
        return;
      }

      setDemoMode(false);

      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const dateLabel = `${dayStart.getFullYear()}-${String(
        dayStart.getMonth() + 1
      ).padStart(2, '0')}-${String(dayStart.getDate()).padStart(2, '0')}`;

      const { count } = await supabaseBrowser
        .from('appointments')
        .select('id', { head: true, count: 'exact' })
        .gte('start_at', dayStart.toISOString())
        .lt('start_at', dayEnd.toISOString());

      let freeSlotsValue = '—';
      let newClientsValue = '—';

      const [{ data: serviceData }, { data: barberData }] = await Promise.all([
        supabaseBrowser
          .from('services')
          .select('id, name, duration_min')
          .eq('is_active', true)
          .order('duration_min', { ascending: true }),
        supabaseBrowser
          .from('barbers')
          .select('id')
          .eq('is_active', true)
      ]);

      const baseService =
        serviceData?.find((service) => service.name === 'Мужская стрижка') ??
        serviceData?.[0];

      if (baseService && barberData && barberData.length > 0) {
        const slotResults = await Promise.all(
          barberData.map((barber) =>
            supabaseBrowser.rpc('rpc_get_availability', {
              p_date: dateLabel,
              p_service_id: baseService.id,
              p_barber_id: barber.id
            })
          )
        );
        const totalSlots = slotResults.reduce((sum, result) => {
          const slots = result.data;
          return sum + (Array.isArray(slots) ? slots.length : 0);
        }, 0);
        freeSlotsValue = String(totalSlots);
      }

      if (role === 'admin') {
        const { count: newClientsCount, error: newClientsError } = await supabaseBrowser
          .from('users')
          .select('id', { head: true, count: 'exact' })
          .eq('role', 'client')
          .gte('created_at', dayStart.toISOString())
          .lt('created_at', dayEnd.toISOString());
        if (!newClientsError && typeof newClientsCount === 'number') {
          newClientsValue = String(newClientsCount);
        }
      }

      setStats([
        { label: 'Сегодня записей', value: typeof count === 'number' ? String(count) : '—' },
        { label: 'Свободные слоты', value: freeSlotsValue },
        { label: 'Новые клиенты', value: newClientsValue }
      ]);

      const { data } = await supabaseBrowser
        .from('appointments')
        .select('id, start_at, status, services(name), barbers(users(full_name))')
        .neq('status', 'cancelled')
        .order('start_at', { ascending: true })
        .limit(3);

      if (!data) {
        setUpcoming([]);
        return;
      }

      setUpcoming(
        data.map((item) => {
          const startAt = item.start_at ? new Date(item.start_at) : null;
          return {
            time: item.start_at ? item.start_at.slice(11, 16) : '--:--',
            client: item.barbers?.users?.full_name ?? 'Мастер',
            service: item.services?.name ?? 'Услуга',
            label: startAt ? buildDayLabel(startAt) : 'скоро'
          };
        })
      );
    };

    load();

    const { data: listener } = supabaseBrowser.auth.onAuthStateChange(() => {
      load();
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <main>
      <section className="hero">
        <span className="badge">Istanbul · мастерская запись</span>
        <h1 className="hero-title">Панель мастера</h1>
        <p className="hero-subtitle">
          Смотрите расписание, подтверждайте записи и управляйте своим днём в
          одном месте.
        </p>
        <div className="hero-actions">
          <Link className="button" href="/dashboard">
            Войти как мастер
          </Link>
          <Link className="button secondary" href="/admin">
            Войти как админ
          </Link>
        </div>
      </section>

      <section className="grid">
        <div className="card">
          <h3>Сегодня</h3>
          <p>Рабочий день 10:00–22:00 · 6 мастеров</p>
          <div className="stats" style={{ marginTop: 16 }}>
            {stats.map((stat) => (
              <div className={`stat${demoMode ? ' is-demo' : ''}`} key={stat.label}>
                <span>{stat.label}</span>
                <h3 style={{ margin: '8px 0 0', fontSize: 22 }}>{stat.value}</h3>
              </div>
            ))}
          </div>
          {demoMode ? (
            <p className="demo-note">
              Демо‑данные. Войдите как мастер или админ, чтобы увидеть реальные записи.
            </p>
          ) : null}
        </div>

        <div className="card">
          <h3>Ближайшие записи</h3>
          <div className="list" style={{ marginTop: 12 }}>
            {!demoMode && upcoming.length === 0 ? (
              <p>Пока нет записей.</p>
            ) : (
              upcoming.map((item) => (
                <div
                  className={`list-item${demoMode ? ' is-demo' : ''}`}
                  key={`${item.time}-${item.client}-${item.service}`}
                >
                  <div>
                    <strong>{item.time}</strong>
                    <span>{item.client}</span>
                    <p>{item.service}</p>
                  </div>
                  <span className={`chip${demoMode ? ' is-demo' : ''}`}>
                    {demoMode ? 'демо' : item.label}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
