'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '../../lib/supabaseBrowser';

const highlights = [
  {
    title: 'Услуги',
    text: 'Обновите цены и длительности, добавьте новые услуги.'
  },
  {
    title: 'Мастера',
    text: 'Добавьте новые профили и управляйте графиком.'
  },
  {
    title: 'Расписание',
    text: 'Включайте выходные и перерывы без звонков.'
  }
];

export default function AdminPage() {
  const [metrics, setMetrics] = useState([
    { label: 'Записей сегодня', value: '—' },
    { label: 'Подтверждено', value: '—' },
    { label: 'Новые клиенты', value: '—' },
    { label: 'Отмены', value: '—' }
  ]);
  const [upcoming, setUpcoming] = useState<
    { time: string; service: string; barber: string }[]
  >([]);

  useEffect(() => {
    const load = async () => {
      if (!supabaseBrowser) return;
      const now = new Date();
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);

      const [appointments, confirmed, cancelled, clients] = await Promise.all([
        supabaseBrowser
          .from('appointments')
          .select('id')
          .gte('start_at', start.toISOString())
          .lt('start_at', end.toISOString()),
        supabaseBrowser
          .from('appointments')
          .select('id')
          .eq('status', 'confirmed')
          .gte('start_at', start.toISOString())
          .lt('start_at', end.toISOString()),
        supabaseBrowser
          .from('appointments')
          .select('id')
          .eq('status', 'cancelled')
          .gte('start_at', start.toISOString())
          .lt('start_at', end.toISOString()),
        supabaseBrowser
          .from('users')
          .select('id')
          .eq('role', 'client')
          .gte('created_at', start.toISOString())
          .lt('created_at', end.toISOString())
      ]);

      setMetrics([
        { label: 'Записей сегодня', value: String(appointments.data?.length ?? 0) },
        { label: 'Подтверждено', value: String(confirmed.data?.length ?? 0) },
        { label: 'Новые клиенты', value: String(clients.data?.length ?? 0) },
        { label: 'Отмены', value: String(cancelled.data?.length ?? 0) }
      ]);

      const { data } = await supabaseBrowser
        .from('appointments')
        .select('id, start_at, status, services(name), barbers(users(full_name))')
        .gte('start_at', now.toISOString())
        .order('start_at', { ascending: true })
        .limit(5);
      if (data) {
        setUpcoming(
          data
            .filter((item) => item.status !== 'cancelled')
            .map((item) => ({
              time: item.start_at ? item.start_at.slice(11, 16) : '--:--',
              service: item.services?.name ?? 'Услуга',
              barber: item.barbers?.users?.full_name ?? 'Мастер'
            }))
        );
      }
    };
    load();
  }, []);

  return (
    <section className="grid">
      <div className="card">
        <h3>Сегодня</h3>
        <div className="stats" style={{ marginTop: 12 }}>
          {metrics.map((item) => (
            <div key={item.label} className="stat">
              <span>{item.label}</span>
              <h3 style={{ margin: '8px 0 0', fontSize: 22 }}>{item.value}</h3>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <h3>Ближайшие записи</h3>
        <div className="list" style={{ marginTop: 12 }}>
          {upcoming.length === 0 ? (
            <p>Пока нет записей.</p>
          ) : (
            upcoming.map((item) => (
              <div className="list-item" key={`${item.time}-${item.service}`}>
                <div>
                  <strong>{item.time}</strong>
                  <span>{item.barber}</span>
                  <p>{item.service}</p>
                </div>
                <span className="chip">сегодня</span>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="card">
        <h3>Что можно сделать</h3>
        <div className="list" style={{ marginTop: 12 }}>
          {highlights.map((item) => (
            <div className="list-item" key={item.title}>
              <div>
                <strong>{item.title}</strong>
                <p>{item.text}</p>
              </div>
              <span className="chip">перейти</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
