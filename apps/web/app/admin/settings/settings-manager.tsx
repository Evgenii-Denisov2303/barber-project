'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '../../../lib/supabaseBrowser';
import { AuthPanel } from '../../components/AuthPanel';

type WorkingHour = {
  id: string;
  weekday: number;
  open_time: string;
  close_time: string;
};

type NotificationSettings = {
  id?: string;
  telegram_enabled: boolean;
  telegram_chat_id: string | null;
  telegram_template?: string | null;
  sms_enabled: boolean;
  sms_sender: string | null;
  sms_template?: string | null;
};

type NotificationLog = {
  id: string;
  channel: string;
  status: 'sent' | 'error' | 'skipped';
  recipient: string | null;
  detail: string | null;
  created_at: string;
  meta?: Record<string, unknown> | null;
  appointment_id?: string | null;
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

const textAreaStyle = {
  fontFamily: 'inherit',
  padding: '10px 12px',
  borderRadius: 14,
  border: '1px solid var(--outline)',
  background: '#fff',
  resize: 'vertical'
};

export function SettingsManager() {
  const [items, setItems] = useState<WorkingHour[]>([]);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationSettings>({
    telegram_enabled: false,
    telegram_chat_id: '',
    telegram_template: '',
    sms_enabled: false,
    sms_sender: '',
    sms_template: ''
  });
  const [testPhone, setTestPhone] = useState('');
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsStatus, setLogsStatus] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!supabaseBrowser) return;
      const { data: loc } = await supabaseBrowser
        .from('locations')
        .select('id')
        .limit(1)
        .maybeSingle();
      const locId = loc?.id ?? null;
      setLocationId(locId);
      if (!locId) return;
      await loadLogs(locId);
      const { data } = await supabaseBrowser
        .from('working_hours')
        .select('id, weekday, open_time, close_time')
        .eq('location_id', locId)
        .order('weekday');
      setItems(data ?? []);
      const { data: notificationData } = await supabaseBrowser
        .from('notification_settings')
        .select('id, telegram_enabled, telegram_chat_id, telegram_template, sms_enabled, sms_sender, sms_template')
        .eq('location_id', locId)
        .maybeSingle();
      if (notificationData) {
        setNotifications({
          id: notificationData.id,
          telegram_enabled: notificationData.telegram_enabled ?? false,
          telegram_chat_id: notificationData.telegram_chat_id ?? '',
          telegram_template: notificationData.telegram_template ?? '',
          sms_enabled: notificationData.sms_enabled ?? false,
          sms_sender: notificationData.sms_sender ?? '',
          sms_template: notificationData.sms_template ?? ''
        });
      }
      setLoading(false);
    };
    loadData();
  }, []);

  const loadLogs = async (locId: string) => {
    if (!supabaseBrowser) return;
    setLogsLoading(true);
    setLogsStatus(null);
    const { data, error } = await supabaseBrowser
      .from('notification_logs')
      .select('id, channel, status, recipient, detail, created_at, meta, appointment_id')
      .eq('location_id', locId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) {
      setLogsStatus(error.message);
      setLogs([]);
      setLogsLoading(false);
      return;
    }
    setLogs((data ?? []) as NotificationLog[]);
    setLogsLoading(false);
  };

  const updateHour = (weekday: number, key: 'open_time' | 'close_time', value: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.weekday === weekday ? { ...item, [key]: value } : item
      )
    );
  };

  const save = async () => {
    if (!supabaseBrowser || !locationId) return;
    setStatus(null);
    const updates = items.map((item) =>
      supabaseBrowser
        .from('working_hours')
        .update({ open_time: item.open_time, close_time: item.close_time })
        .eq('id', item.id)
    );
    const results = await Promise.all(updates);
    const error = results.find((result) => result.error)?.error;
    if (error) {
      setStatus(error.message);
      return;
    }
    setStatus('График обновлён');
  };

  const saveNotifications = async () => {
    if (!supabaseBrowser || !locationId) return;
    setStatus(null);
    if (notifications.telegram_enabled && !notifications.telegram_chat_id) {
      setStatus('Введите Telegram chat_id');
      return;
    }
    if (notifications.sms_enabled && !notifications.sms_sender) {
      setStatus('Введите SMS Sender');
      return;
    }
    const payload = {
      location_id: locationId,
      telegram_enabled: notifications.telegram_enabled,
      telegram_chat_id: notifications.telegram_chat_id || null,
      telegram_template: notifications.telegram_template || null,
      sms_enabled: notifications.sms_enabled,
      sms_sender: notifications.sms_sender || null,
      sms_template: notifications.sms_template || null
    };
    const { error } = await supabaseBrowser
      .from('notification_settings')
      .upsert(payload, { onConflict: 'location_id' });
    if (error) {
      setStatus(error.message);
      return;
    }
    setStatus('Настройки уведомлений сохранены');
  };

  const sendTestNotification = async (channel: 'telegram' | 'sms') => {
    if (!supabaseBrowser || !locationId) return;
    setStatus(null);
    if (channel === 'sms' && !testPhone) {
      setStatus('Введите телефон для тестового SMS');
      return;
    }
    const normalizedPhone = channel === 'sms' ? normalizePhone(testPhone) : null;
    if (channel === 'sms' && !normalizedPhone) {
      setStatus('Введите корректный номер телефона');
      return;
    }
    const payload = {
      channel,
      phone: channel === 'sms' ? normalizedPhone : undefined,
      locationId
    };
    const { data, error } = await supabaseBrowser.functions.invoke('notify-test', {
      body: payload
    });
    if (error) {
      setStatus(error.message);
      return;
    }
    if (data?.errors?.length) {
      setStatus(`Ошибка теста: ${data.errors.join(', ')}`);
      return;
    }
    setStatus(channel === 'sms' ? 'Тест SMS отправлен' : 'Тест Telegram отправлен');
    await loadLogs(locationId);
  };

  if (!supabaseBrowser) {
    return <AuthPanel />;
  }

  if (loading) {
    return <p>Загрузка...</p>;
  }

  const hasSchedule = items.length > 0;

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <strong>Редактировать график</strong>
      {hasSchedule ? (
        <>
          {weekdays.map((day) => {
            const item = items.find((row) => row.weekday === day.id);
            if (!item) return null;
            return (
              <div key={day.id} className="list-item">
                <strong>{day.label}</strong>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="time"
                    value={item.open_time}
                    onChange={(e) => updateHour(day.id, 'open_time', e.target.value)}
                  />
                  <input
                    type="time"
                    value={item.close_time}
                    onChange={(e) => updateHour(day.id, 'close_time', e.target.value)}
                  />
                </div>
              </div>
            );
          })}
          <button className="button" onClick={save}>
            Сохранить
          </button>
        </>
      ) : (
        <p>Нет данных по графику.</p>
      )}
      {status ? <p>{status}</p> : null}

      <div className="card" style={{ marginTop: 12 }}>
        <strong>Уведомления</strong>
        <div
          style={{
            marginTop: 10,
            padding: '10px 12px',
            borderRadius: 14,
            border: '1px dashed var(--outline)',
            background: '#fff6ec',
            color: '#6b5a4f',
            fontSize: 13,
            lineHeight: 1.4,
            display: 'grid',
            gap: 6
          }}
        >
          <strong>Как включить</strong>
          <span>
            Telegram: создайте бота через @BotFather → добавьте бота в чат/канал →
            получите chat_id → вставьте сюда и включите уведомления.
          </span>
          <span>
            SMS (MTS Exolve): получите API ключ → подтвердите Sender/номер в Exolve →
            добавьте `MTS_EXOLVE_API_KEY` в Edge Functions → укажите Sender.
          </span>
        </div>
        <div style={{ display: 'grid', gap: 12, marginTop: 10 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Telegram chat_id</span>
            <input
              type="text"
              value={notifications.telegram_chat_id ?? ''}
              onChange={(e) =>
                setNotifications((prev) => ({ ...prev, telegram_chat_id: e.target.value }))
              }
              placeholder="-1001234567890"
            />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Шаблон Telegram</span>
            <textarea
              value={notifications.telegram_template ?? ''}
              onChange={(e) =>
                setNotifications((prev) => ({ ...prev, telegram_template: e.target.value }))
              }
              placeholder={'🗓 {event}\\nВремя: {datetime}\\nУслуга: {service}\\nМастер: {barber}\\nКлиент: {client}\\nТелефон: {client_phone}\\nСалон: {location}\\nАдрес: {address}'}
              rows={6}
              style={textAreaStyle}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={notifications.telegram_enabled}
              onChange={(e) =>
                setNotifications((prev) => ({ ...prev, telegram_enabled: e.target.checked }))
              }
            />
            <span>Включить Telegram уведомления</span>
          </label>
          <div style={{ display: 'grid', gap: 6 }}>
            <strong>SMS (МТС Exolve)</strong>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={notifications.sms_enabled}
                onChange={(e) =>
                  setNotifications((prev) => ({ ...prev, sms_enabled: e.target.checked }))
                }
              />
              <span>Включить SMS</span>
            </label>
            <input
              type="text"
              value={notifications.sms_sender ?? ''}
              onChange={(e) =>
                setNotifications((prev) => ({ ...prev, sms_sender: e.target.value }))
              }
              placeholder="Sender / номера, подтвержденные в Exolve"
            />
            <label style={{ display: 'grid', gap: 6 }}>
              <span>Шаблон SMS</span>
              <textarea
                value={notifications.sms_template ?? ''}
                onChange={(e) =>
                  setNotifications((prev) => ({ ...prev, sms_template: e.target.value }))
                }
                placeholder={'{event} · {date} {time} · {service} · {barber}'}
                rows={3}
                style={textAreaStyle}
              />
            </label>
          </div>
          <button className="button" onClick={saveNotifications}>
            Сохранить уведомления
          </button>
          <div style={{ display: 'grid', gap: 8 }}>
            <strong>Тест уведомлений</strong>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button
                className="button secondary"
                onClick={() => sendTestNotification('telegram')}
              >
                Тест Telegram
              </button>
              <input
                type="text"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="+7 900 000-00-00"
                style={{ minWidth: 180 }}
              />
              <button
                className="button secondary"
                onClick={() => sendTestNotification('sms')}
              >
                Тест SMS
              </button>
            </div>
            <small style={{ color: '#8b6f5d' }}>
              Для SMS укажите номер получателя. Telegram использует chat_id из настроек.
            </small>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <strong>Логи уведомлений</strong>
              <button
                className="button secondary"
                style={{ marginLeft: 'auto' }}
                onClick={() => locationId && loadLogs(locationId)}
                disabled={logsLoading}
              >
                {logsLoading ? 'Обновление...' : 'Обновить'}
              </button>
            </div>
            {logsStatus ? (
              <p>{logsStatus}</p>
            ) : logs.length === 0 ? (
              <p style={{ color: '#8b6f5d' }}>
                Пока нет данных. После отправки теста логи появятся здесь.
              </p>
            ) : (
              <div className="list">
                {logs.map((log) => (
                  <div key={log.id} className="list-item" style={{ alignItems: 'flex-start' }}>
                    <div style={{ display: 'grid', gap: 4 }}>
                      <strong>{log.channel}</strong>
                      <span style={{ fontSize: 12, color: '#8b6f5d' }}>
                        {new Date(log.created_at).toLocaleString('ru-RU')}
                      </span>
                      <span style={{ fontSize: 12, color: '#8b6f5d' }}>
                        {log.meta && typeof log.meta === 'object' && 'event' in log.meta
                          ? String(log.meta.event)
                          : 'Уведомление'}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gap: 6, textAlign: 'right' }}>
                      <span
                        className="chip"
                        style={{
                          background:
                            log.status === 'sent'
                              ? '#e6f6e9'
                              : log.status === 'error'
                              ? '#fde8e8'
                              : '#f3e1ce',
                          color:
                            log.status === 'sent'
                              ? '#1b6b2a'
                              : log.status === 'error'
                              ? '#8b1c1c'
                              : '#6b3a12'
                        }}
                      >
                        {log.status}
                      </span>
                      {log.recipient ? (
                        <span style={{ fontSize: 12 }}>{log.recipient}</span>
                      ) : null}
                      {log.detail ? (
                        <span style={{ fontSize: 12, color: '#8b6f5d' }}>{log.detail}</span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function normalizePhone(value: string) {
  const digits = value.replace(/[^\d]/g, '');
  if (!digits) return null;
  if (digits.length === 10) return `7${digits}`;
  if (digits.length === 11 && digits.startsWith('8')) return `7${digits.slice(1)}`;
  if (digits.length === 11 && digits.startsWith('7')) return digits;
  return null;
}
