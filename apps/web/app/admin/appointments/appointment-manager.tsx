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
  barberId: string;
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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [filterBarber, setFilterBarber] = useState('');
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState('');
  const [newDate, setNewDate] = useState(getToday());
  const [newTime, setNewTime] = useState('');
  const [createDate, setCreateDate] = useState(getToday());
  const [createTime, setCreateTime] = useState('');
  const [clientEmail, setClientEmail] = useState('');

  useEffect(() => {
    setItems(initial);
  }, [initial]);

  const refresh = async () => {
    if (!supabaseBrowser) return;
    const { data } = await supabaseBrowser
      .from('appointments')
      .select('id, start_at, status, barber_id, services(name), barbers(id, users(full_name))')
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
        barberId: item.barbers?.id ?? item.barber_id ?? '',
        status: item.status
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

  const createAppointment = async () => {
    if (!supabaseBrowser || !selectedService || !selectedBarber || !createDate || !createTime) {
      setStatus('Заполните услугу, мастера и время');
      return;
    }
    setStatus(null);
    let clientId: string | null = null;
    if (clientEmail.trim()) {
      const { data: userData, error: userError } = await supabaseBrowser
        .from('users')
        .select('id')
        .eq('email', clientEmail.trim())
        .single();
      if (userError || !userData) {
        setStatus('Клиент не найден по email');
        return;
      }
      clientId = userData.id;
    }
    const payload = `${createDate}T${createTime}:00+03:00`;
    const { data, error } = await supabaseBrowser.rpc('rpc_create_appointment', {
      p_service_id: selectedService,
      p_barber_id: selectedBarber,
      p_start_at: payload,
      p_client_id: clientId ?? undefined
    });
    if (error) {
      setStatus(formatRpcError(error.message));
      return;
    }
    if (data) {
      void notifyTelegram(data, 'created');
    }
    setStatus('Запись создана');
    setCreateTime('');
    setClientEmail('');
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

  const filteredItems = items.filter((item) => {
    const matchesStatus =
      statusFilter === 'all' ? true : item.status === statusFilter;
    const term = search.trim().toLowerCase();
    const matchesSearch = term
      ? item.service.toLowerCase().includes(term) || item.barber.toLowerCase().includes(term)
      : true;
    const matchesDate = filterDate ? item.date === filterDate : true;
    const matchesBarber = filterBarber ? item.barberId === filterBarber : true;
    return matchesStatus && matchesSearch && matchesDate && matchesBarber;
  });

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div className="card">
        <strong>Создать запись</strong>
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
            value={createDate}
            onChange={(e) => setCreateDate(e.target.value)}
            style={inputStyle}
          />
          <input
            type="time"
            value={createTime}
            onChange={(e) => setCreateTime(e.target.value)}
            style={inputStyle}
          />
          <input
            type="email"
            placeholder="Email клиента (опционально)"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            style={inputStyle}
          />
          <button className="button" onClick={createAppointment}>
            Создать запись
          </button>
        </div>
      </div>

      <strong>Управление статусами</strong>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          placeholder="Поиск по услуге или мастеру"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={inputStyle}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={inputStyle}
        >
          <option value="all">Все</option>
          <option value="pending">Ожидает</option>
          <option value="confirmed">Подтверждено</option>
          <option value="cancelled">Отменено</option>
        </select>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          style={inputStyle}
        />
        <select
          value={filterBarber}
          onChange={(e) => setFilterBarber(e.target.value)}
          style={inputStyle}
        >
          <option value="">Все мастера</option>
          {barbers.map((barber) => (
            <option key={barber.id} value={barber.id}>
              {barber.name}
            </option>
          ))}
        </select>
      </div>
      {filteredItems.map((item) => (
        <div key={item.id} className="list-item">
          <div>
            <strong>{item.time} · {item.service}</strong>
            <p>Мастер: {item.barber}</p>
            <p>Статус: {formatStatus(item.status)}</p>
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

function formatStatus(value: string) {
  if (value === 'confirmed') return 'подтверждено';
  if (value === 'cancelled') return 'отменено';
  if (value === 'pending') return 'ожидает';
  if (value === 'completed') return 'завершено';
  return value;
}

function formatRpcError(message: string) {
  if (message.includes('slot_taken')) {
    return 'Слот уже занят, выберите другое время';
  }
  if (message.includes('outside_working_hours')) {
    return 'Время вне рабочего графика';
  }
  if (message.includes('barber_unavailable')) {
    return 'У мастера выходной или перерыв';
  }
  if (message.includes('service_not_found')) {
    return 'Услуга не найдена';
  }
  return message;
}

const inputStyle: CSSProperties = {
  padding: '10px 12px',
  borderRadius: 12,
  border: '1px solid #e6d2be',
  background: '#fff',
  fontSize: 14
};
