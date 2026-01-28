'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { supabaseBrowser } from '../../lib/supabaseBrowser';
import { notifyTelegram } from '../../lib/notify';
import { AuthPanel } from '../components/AuthPanel';

type ScheduleItem = {
  id: string;
  date: string;
  time: string;
  client: string;
  service: string;
  status: string;
};

export function BarberSchedule() {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [rescheduleInputs, setRescheduleInputs] = useState<
    Record<string, { date: string; time: string }>
  >({});

  const load = async () => {
    if (!supabaseBrowser) return;
    const { data: sessionData } = await supabaseBrowser.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) return;
    const { data: barberData } = await supabaseBrowser
      .from('barbers')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    const barberId = barberData?.id;
    if (!barberId) return;
    const { data } = await supabaseBrowser
      .from('appointments')
      .select('id, start_at, status, services(name)')
      .eq('barber_id', barberId)
      .order('start_at', { ascending: true })
      .limit(20);
    if (!data) return;
    setItems(
      data.map((item) => ({
        id: item.id,
        date: item.start_at ? item.start_at.slice(0, 10) : '',
        time: item.start_at ? item.start_at.slice(11, 16) : '--:--',
        client: 'Клиент',
        service: item.services?.name ?? 'Услуга',
        status: item.status
      }))
    );
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id: string, nextStatus: string) => {
    if (!supabaseBrowser) return;
    const { error } = await supabaseBrowser
      .from('appointments')
      .update({ status: nextStatus })
      .eq('id', id);
    if (error) {
      setStatus(error.message);
      return;
    }
    setStatus('Статус обновлён');
    const event =
      nextStatus === 'confirmed'
        ? 'confirmed'
        : nextStatus === 'cancelled'
          ? 'cancelled'
          : 'status';
    void notifyTelegram(id, event);
    load();
  };

  const updateReschedule = (id: string, key: 'date' | 'time', value: string) => {
    setRescheduleInputs((prev) => ({
      ...prev,
      [id]: {
        date: prev[id]?.date ?? getToday(),
        time: prev[id]?.time ?? '',
        [key]: value
      }
    }));
  };

  const reschedule = async (id: string) => {
    const payload = rescheduleInputs[id];
    if (!payload?.date || !payload?.time) {
      setStatus('Выберите дату и время для переноса');
      return;
    }
    if (!supabaseBrowser) return;
    const { error } = await supabaseBrowser.rpc('rpc_reschedule_appointment', {
      p_appointment_id: id,
      p_new_start_at: `${payload.date}T${payload.time}:00+03:00`
    });
    if (error) {
      setStatus(error.message);
      return;
    }
    setStatus('Запись перенесена');
    void notifyTelegram(id, 'rescheduled');
    load();
  };

  if (!supabaseBrowser) {
    return <AuthPanel />;
  }

  return (
    <section className="card">
      <h3>Записи на сегодня</h3>
      <div className="list" style={{ marginTop: 12 }}>
        {items.length === 0 ? (
          <p>Нет записей.</p>
        ) : (
          items.map((item) => (
            <div className="list-item" key={item.id}>
              <div>
                <strong>
                  {item.date} · {item.time}
                </strong>
                <span>{item.client}</span>
                <p>{item.service}</p>
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="button secondary"
                    onClick={() => updateStatus(item.id, 'confirmed')}
                  >
                    Подтвердить
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => updateStatus(item.id, 'cancelled')}
                  >
                    Отменить
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="date"
                    value={rescheduleInputs[item.id]?.date ?? item.date ?? getToday()}
                    onChange={(e) => updateReschedule(item.id, 'date', e.target.value)}
                    style={inputStyle}
                  />
                  <input
                    type="time"
                    value={rescheduleInputs[item.id]?.time ?? item.time}
                    onChange={(e) => updateReschedule(item.id, 'time', e.target.value)}
                    style={inputStyle}
                  />
                  <button
                    className="button secondary"
                    onClick={() => reschedule(item.id)}
                  >
                    Перенести
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      {status ? <p style={{ marginTop: 12 }}>{status}</p> : null}
    </section>
  );
}

function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const inputStyle: CSSProperties = {
  padding: '8px 10px',
  borderRadius: 10,
  border: '1px solid #e6d2be',
  background: '#fff',
  fontSize: 13
};
