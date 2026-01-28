'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { supabaseBrowser } from '../../../lib/supabaseBrowser';
import { notifyTelegram } from '../../../lib/notify';
import { AuthPanel } from '../../components/AuthPanel';

type AppointmentItem = {
  id: string;
  date: string;
  time: string;
  client: string;
  service: string;
  barber: string;
  status: string;
};

type Props = {
  initial: AppointmentItem[];
};

type ServiceOption = {
  id: string;
  name: string;
  durationMin: number;
};

type BarberOption = {
  id: string;
  name: string;
};

export function AppointmentManager({ initial }: Props) {
  const [items, setItems] = useState<AppointmentItem[]>(initial);
  const [status, setStatus] = useState<string | null>(null);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [barbers, setBarbers] = useState<BarberOption[]>([]);
  const [selectedService, setSelectedService] = useState('');
  const [selectedBarber, setSelectedBarber] = useState('');
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState('');
  const [newDate, setNewDate] = useState(getToday());
  const [newTime, setNewTime] = useState('');

  useEffect(() => {
    setItems(initial);
  }, [initial]);

  const refresh = async () => {
    if (!supabaseBrowser) return;
    const { data } = await supabaseBrowser
      .from('appointments')
      .select('id, start_at, status, services(name), barbers(users(full_name))')
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
        barber: item.barbers?.users?.full_name ?? 'Мастер',
        status: item.status === 'confirmed' ? 'подтверждено' : item.status
      }))
    );
  };

  const loadOptions = async () => {
    if (!supabaseBrowser) return;
    const { data: serviceData } = await supabaseBrowser
      .from('services')
      .select('id, name, duration_min, is_active')
      .eq('is_active', true)
      .order('name');
    if (serviceData) {
      setServices(
        serviceData.map((item) => ({
          id: item.id,
          name: item.name,
          durationMin: item.duration_min
        }))
      );
    }

    const { data: barberData } = await supabaseBrowser
      .from('barbers')
      .select('id, users(full_name)')
      .eq('is_active', true);
    if (barberData) {
      setBarbers(
        barberData.map((item) => ({
          id: item.id,
          name: item.users?.full_name ?? 'Мастер'
        }))
      );
    }
  };

  useEffect(() => {
    refresh();
    loadOptions();
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
    refresh();
  };

  const checkSlots = async () => {
    if (!supabaseBrowser || !selectedService || !selectedBarber || !selectedDate) {
      setStatus('Выберите услугу, мастера и дату');
      return;
    }
    const { data, error } = await supabaseBrowser.rpc('rpc_get_availability', {
      p_date: selectedDate,
      p_service_id: selectedService,
      p_barber_id: selectedBarber
    });
    if (error || !data) {
      setStatus(error?.message ?? 'Ошибка загрузки слотов');
      return;
    }
    setSlots(data.map((item: { slot_start: string }) => item.slot_start.slice(11, 16)));
  };

  const reschedule = async () => {
    if (!supabaseBrowser || !selectedAppointment || !newDate || !newTime) {
      setStatus('Выберите запись и новое время');
      return;
    }
    const payload = `${newDate}T${newTime}:00+03:00`;
    const { error } = await supabaseBrowser.rpc('rpc_reschedule_appointment', {
      p_appointment_id: selectedAppointment,
      p_new_start_at: payload
    });
    if (error) {
      setStatus(error.message);
      return;
    }
    setStatus('Запись перенесена');
    void notifyTelegram(selectedAppointment, 'rescheduled');
    refresh();
  };

  if (!supabaseBrowser) {
    return <AuthPanel />;
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <strong>Управление статусами</strong>
      {items.map((item) => (
        <div key={item.id} className="list-item">
          <div>
            <strong>{item.time} · {item.service}</strong>
            <p>Мастер: {item.barber}</p>
          </div>
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
        </div>
      ))}
      {status ? <p>{status}</p> : null}

      <div className="card" style={{ marginTop: 12 }}>
        <strong>Свободные слоты</strong>
        <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            style={inputStyle}
          >
            <option value="">Услуга</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
          <select
            value={selectedBarber}
            onChange={(e) => setSelectedBarber(e.target.value)}
            style={inputStyle}
          >
            <option value="">Мастер</option>
            {barbers.map((barber) => (
              <option key={barber.id} value={barber.id}>
                {barber.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={inputStyle}
          />
          <button className="button" onClick={checkSlots}>
            Показать слоты
          </button>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {slots.map((slot) => (
              <span key={slot} className="chip">
                {slot}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <strong>Перенести запись</strong>
        <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
          <select
            value={selectedAppointment}
            onChange={(e) => setSelectedAppointment(e.target.value)}
            style={inputStyle}
          >
            <option value="">Выберите запись</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.date} {item.time} · {item.service}
              </option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              style={inputStyle}
            />
            <input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              style={inputStyle}
            />
          </div>
          <button className="button" onClick={reschedule}>
            Перенести
          </button>
        </div>
      </div>
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

const inputStyle: CSSProperties = {
  padding: '10px 12px',
  borderRadius: 12,
  border: '1px solid #e6d2be',
  background: '#fff',
  fontSize: 14
};
