'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '../../../lib/supabaseBrowser';
import { AuthPanel } from '../../components/AuthPanel';

export function LocationManager() {
  const [locationId, setLocationId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [timezone, setTimezone] = useState('Europe/Moscow');
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!supabaseBrowser) return;
      const { data } = await supabaseBrowser
        .from('locations')
        .select('id, name, address, phone, timezone')
        .limit(1)
        .maybeSingle();
      if (!data) return;
      setLocationId(data.id);
      setName(data.name ?? '');
      setAddress(data.address ?? '');
      setPhone(data.phone ?? '');
      setTimezone(data.timezone ?? 'Europe/Moscow');
    };
    load();
  }, []);

  const save = async () => {
    if (!supabaseBrowser) return;
    setStatus(null);
    if (!name || !address) {
      setStatus('Заполните название и адрес');
      return;
    }
    const payload = {
      id: locationId ?? undefined,
      name,
      address,
      phone: phone.trim() ? phone.trim() : null,
      timezone: timezone.trim() ? timezone.trim() : 'Europe/Moscow'
    };
    const { data, error } = await supabaseBrowser
      .from('locations')
      .upsert(payload)
      .select('id')
      .single();
    if (error) {
      setStatus(error.message);
      return;
    }
    setLocationId(data?.id ?? locationId);
    setStatus('Локация сохранена');
  };

  if (!supabaseBrowser) {
    return <AuthPanel />;
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <strong>Локация</strong>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Название"
      />
      <input
        type="text"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="Адрес"
      />
      <input
        type="text"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Телефон"
      />
      <input
        type="text"
        value={timezone}
        onChange={(e) => setTimezone(e.target.value)}
        placeholder="Europe/Moscow"
      />
      <button className="button" onClick={save}>
        Сохранить локацию
      </button>
      {status ? <p>{status}</p> : null}
    </div>
  );
}
