'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '../../../lib/supabaseBrowser';
import { AuthPanel } from '../../components/AuthPanel';

type BarberOption = {
  id: string;
  name: string;
};

type BarberWorkingHour = {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
};

const weekdays = [
  { id: 1, label: 'Понедельник' },
  { id: 2, label: 'Вторник' },
  { id: 3, label: 'Среда' },
  { id: 4, label: 'Четверг' },
  { id: 5, label: 'Пятница' },
  { id: 6, label: 'Суббота' },
  { id: 7, label: 'Воскресенье' }
];

export function BarberScheduleManager() {
  const [barbers, setBarbers] = useState<BarberOption[]>([]);
  const [selectedBarberId, setSelectedBarberId] = useState('');
  const [hours, setHours] = useState<BarberWorkingHour[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadBarbers = async () => {
      if (!supabaseBrowser) return;
      const { data } = await supabaseBrowser
        .from('barbers')
        .select('id, users(full_name)')
        .eq('is_active', true)
        .order('created_at', { ascending: true });
      if (!data) return;
      setBarbers(
        data.map((item) => ({
          id: item.id,
          name: item.users?.full_name ?? 'Мастер'
        }))
      );
      if (!selectedBarberId && data.length > 0) {
        setSelectedBarberId(data[0].id);
      }
    };
    loadBarbers();
  }, [selectedBarberId]);

  useEffect(() => {
    const loadHours = async () => {
      if (!supabaseBrowser || !selectedBarberId) return;
      setLoading(true);
      const { data } = await supabaseBrowser
        .from('barber_working_hours')
        .select('id, weekday, start_time, end_time')
        .eq('barber_id', selectedBarberId)
        .order('weekday');
      setHours((data ?? []) as BarberWorkingHour[]);
      setLoading(false);
    };
    loadHours();
  }, [selectedBarberId]);

  const updateHour = (weekday: number, key: 'start_time' | 'end_time', value: string) => {
    setHours((prev) => {
      const existing = prev.find((item) => item.weekday === weekday);
      if (existing) {
        return prev.map((item) =>
          item.weekday === weekday ? { ...item, [key]: value } : item
        );
      }
      return [
        ...prev,
        { id: `${weekday}`, weekday, start_time: key === 'start_time' ? value : '', end_time: key === 'end_time' ? value : '' }
      ];
    });
  };

  const save = async () => {
    if (!supabaseBrowser || !selectedBarberId) return;
    setStatus(null);
    const payload = weekdays
      .map((day) => {
        const record = hours.find((item) => item.weekday === day.id);
        return {
          barber_id: selectedBarberId,
          weekday: day.id,
          start_time: record?.start_time?.trim() ?? '',
          end_time: record?.end_time?.trim() ?? ''
        };
      })
      .filter((row) => row.start_time && row.end_time);

    const { error: deleteError } = await supabaseBrowser
      .from('barber_working_hours')
      .delete()
      .eq('barber_id', selectedBarberId);
    if (deleteError) {
      setStatus(deleteError.message);
      return;
    }
    if (payload.length > 0) {
      const { error: insertError } = await supabaseBrowser
        .from('barber_working_hours')
        .insert(payload);
      if (insertError) {
        setStatus(insertError.message);
        return;
      }
    }
    setStatus('График мастера сохранён');
  };

  const clear = async () => {
    if (!supabaseBrowser || !selectedBarberId) return;
    setStatus(null);
    const { error } = await supabaseBrowser
      .from('barber_working_hours')
      .delete()
      .eq('barber_id', selectedBarberId);
    if (error) {
      setStatus(error.message);
      return;
    }
    setHours([]);
    setStatus('График очищен');
  };

  if (!supabaseBrowser) {
    return <AuthPanel />;
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <strong>Индивидуальный график мастера</strong>
      <select
        value={selectedBarberId}
        onChange={(e) => setSelectedBarberId(e.target.value)}
        style={{ padding: '10px 12px', borderRadius: 12, border: '1px solid #e6d2be' }}
      >
        {barbers.map((barber) => (
          <option key={barber.id} value={barber.id}>
            {barber.name}
          </option>
        ))}
      </select>

      {loading ? (
        <p>Загрузка...</p>
      ) : (
        <div className="list">
          {weekdays.map((day) => {
            const record = hours.find((item) => item.weekday === day.id);
            return (
              <div key={day.id} className="list-item">
                <strong>{day.label}</strong>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="time"
                    value={record?.start_time ?? ''}
                    onChange={(e) => updateHour(day.id, 'start_time', e.target.value)}
                  />
                  <input
                    type="time"
                    value={record?.end_time ?? ''}
                    onChange={(e) => updateHour(day.id, 'end_time', e.target.value)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="button" onClick={save}>
          Сохранить график
        </button>
        <button className="button secondary" onClick={clear}>
          Очистить
        </button>
      </div>
      {status ? <p>{status}</p> : null}
    </div>
  );
}
