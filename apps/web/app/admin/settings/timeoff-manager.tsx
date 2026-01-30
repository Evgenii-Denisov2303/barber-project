'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '../../../lib/supabaseBrowser';
import { AuthPanel } from '../../components/AuthPanel';

type BarberOption = {
  id: string;
  name: string;
};

type TimeOffItem = {
  id: string;
  start_at: string;
  end_at: string;
  reason: string | null;
};

export function TimeOffManager() {
  const [barbers, setBarbers] = useState<BarberOption[]>([]);
  const [selectedBarberId, setSelectedBarberId] = useState('');
  const [items, setItems] = useState<TimeOffItem[]>([]);
  const [startDate, setStartDate] = useState(getToday());
  const [startTime, setStartTime] = useState('12:00');
  const [endDate, setEndDate] = useState(getToday());
  const [endTime, setEndTime] = useState('13:00');
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<string | null>(null);

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

  const loadItems = async (barberId: string) => {
    if (!supabaseBrowser || !barberId) return;
    const { data } = await supabaseBrowser
      .from('time_off')
      .select('id, start_at, end_at, reason')
      .eq('barber_id', barberId)
      .order('start_at', { ascending: false });
    setItems((data ?? []) as TimeOffItem[]);
  };

  useEffect(() => {
    if (!selectedBarberId) return;
    loadItems(selectedBarberId);
  }, [selectedBarberId]);

  const addTimeOff = async () => {
    if (!supabaseBrowser || !selectedBarberId) return;
    setStatus(null);
    if (!startDate || !startTime || !endDate || !endTime) {
      setStatus('Заполните дату и время');
      return;
    }
    const startAt = `${startDate}T${startTime}:00+03:00`;
    const endAt = `${endDate}T${endTime}:00+03:00`;
    const { error } = await supabaseBrowser.from('time_off').insert({
      barber_id: selectedBarberId,
      start_at: startAt,
      end_at: endAt,
      reason: reason.trim() ? reason.trim() : null
    });
    if (error) {
      setStatus(error.message);
      return;
    }
    setReason('');
    await loadItems(selectedBarberId);
    setStatus('Перерыв добавлен');
  };

  const removeItem = async (id: string) => {
    if (!supabaseBrowser) return;
    setStatus(null);
    const { error } = await supabaseBrowser.from('time_off').delete().eq('id', id);
    if (error) {
      setStatus(error.message);
      return;
    }
    await loadItems(selectedBarberId);
  };

  if (!supabaseBrowser) {
    return <AuthPanel />;
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <strong>Перерывы и выходные</strong>
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

      <div className="card" style={{ display: 'grid', gap: 8 }}>
        <strong>Добавить перерыв</strong>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>
        <input
          type="text"
          placeholder="Причина (опционально)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <button className="button" onClick={addTimeOff}>
          Добавить
        </button>
      </div>

      {items.length === 0 ? (
        <p>Нет перерывов.</p>
      ) : (
        <div className="list">
          {items.map((item) => (
            <div key={item.id} className="list-item">
              <div>
                <strong>{formatDate(item.start_at)} → {formatDate(item.end_at)}</strong>
                <p>{item.reason ?? 'Перерыв'}</p>
              </div>
              <button className="button secondary" onClick={() => removeItem(item.id)}>
                Удалить
              </button>
            </div>
          ))}
        </div>
      )}
      {status ? <p>{status}</p> : null}
    </div>
  );
}

function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ru-RU');
}
