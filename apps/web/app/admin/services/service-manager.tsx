'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { supabaseBrowser } from '../../../lib/supabaseBrowser';
import { AuthPanel } from '../../components/AuthPanel';

type ServiceItem = {
  id: string;
  name: string;
  durationMin: number;
  price: number;
  isActive: boolean;
};

type Props = {
  initial: ServiceItem[];
};

export function ServiceManager({ initial }: Props) {
  const [items, setItems] = useState<ServiceItem[]>(initial);
  const [name, setName] = useState('');
  const [durationMin, setDurationMin] = useState('');
  const [price, setPrice] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setItems(initial);
  }, [initial]);

  const refresh = async () => {
    if (!supabaseBrowser) return;
    const { data } = await supabaseBrowser
      .from('services')
      .select('id, name, duration_min, price, is_active')
      .order('name');
    if (!data) return;
    setItems(
      data.map((item) => ({
        id: item.id,
        name: item.name,
        durationMin: item.duration_min,
        price: item.price,
        isActive: item.is_active
      }))
    );
  };

  useEffect(() => {
    refresh();
  }, []);

  const createService = async () => {
    if (!supabaseBrowser) return;
    setStatus(null);
    const durationValue = Number(durationMin);
    const priceValue = Number(price);
    if (!name || !durationValue || !priceValue) {
      setStatus('Заполните все поля');
      return;
    }
    const { error } = await supabaseBrowser.from('services').insert({
      name,
      duration_min: durationValue,
      price: priceValue,
      is_active: true
    });
    if (error) {
      setStatus(error.message);
      return;
    }
    setName('');
    setDurationMin('');
    setPrice('');
    await refresh();
    setStatus('Услуга добавлена');
  };

  const toggleService = async (service: ServiceItem) => {
    if (!supabaseBrowser) return;
    const { error } = await supabaseBrowser
      .from('services')
      .update({ is_active: !service.isActive })
      .eq('id', service.id);
    if (!error) refresh();
  };

  const startEdit = (service: ServiceItem) => {
    setEditingId(service.id);
    setEditName(service.name);
    setEditDuration(String(service.durationMin));
    setEditPrice(String(service.price));
  };

  const saveEdit = async () => {
    if (!supabaseBrowser || !editingId) return;
    setStatus(null);
    const durationValue = Number(editDuration);
    const priceValue = Number(editPrice);
    if (!editName || !durationValue || !priceValue) {
      setStatus('Заполните все поля');
      return;
    }
    const { error } = await supabaseBrowser
      .from('services')
      .update({
        name: editName,
        duration_min: durationValue,
        price: priceValue
      })
      .eq('id', editingId);
    if (error) {
      setStatus(error.message);
      return;
    }
    setEditingId(null);
    setEditName('');
    setEditDuration('');
    setEditPrice('');
    setStatus('Услуга обновлена');
    refresh();
  };

  if (!supabaseBrowser) {
    return <AuthPanel />;
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'grid', gap: 8 }}>
        <strong>Добавить услугу</strong>
        <input
          style={inputStyle}
          placeholder="Название"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="form-row">
          <input
            style={inputStyle}
            placeholder="Длительность, мин"
            value={durationMin}
            onChange={(e) => setDurationMin(e.target.value)}
          />
          <input
            style={inputStyle}
            placeholder="Цена, ₽"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <button className="button" onClick={createService}>
          Добавить
        </button>
        {status ? <p>{status}</p> : null}
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <strong>Управление</strong>
        {items.map((item) => (
          <div key={item.id} className="list-item">
            {editingId === item.id ? (
              <div style={{ display: 'grid', gap: 6, flex: 1 }}>
                <input
                  style={inputStyle}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
                <div className="form-row">
                  <input
                    style={inputStyle}
                    value={editDuration}
                    onChange={(e) => setEditDuration(e.target.value)}
                  />
                  <input
                    style={inputStyle}
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                  />
                </div>
                <div className="action-row">
                  <button className="button secondary" onClick={saveEdit}>
                    Сохранить
                  </button>
                  <button className="button secondary" onClick={() => setEditingId(null)}>
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <strong>{item.name}</strong>
                  <p>
                    {item.durationMin} мин · {item.price} ₽
                  </p>
                </div>
                <div className="action-row">
                  <button
                    className="button secondary"
                    onClick={() => startEdit(item)}
                  >
                    Редактировать
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => toggleService(item)}
                  >
                    {item.isActive ? 'Скрыть' : 'Активировать'}
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const inputStyle: CSSProperties = {
  padding: '10px 12px',
  borderRadius: 12,
  border: '1px solid #e6d2be',
  background: '#fff',
  fontSize: 14,
  flex: 1
};
