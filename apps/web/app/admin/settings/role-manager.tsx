'use client';

import { useState, type CSSProperties } from 'react';
import { supabaseBrowser } from '../../../lib/supabaseBrowser';
import { AuthPanel } from '../../components/AuthPanel';

export function RoleManager() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('barber');
  const [status, setStatus] = useState<string | null>(null);

  const updateRole = async () => {
    if (!supabaseBrowser) return;
    setStatus(null);
    if (!email) {
      setStatus('Введите email');
      return;
    }
    const { data, error } = await supabaseBrowser
      .from('users')
      .select('id')
      .eq('email', email)
      .single();
    if (error || !data) {
      setStatus('Пользователь не найден');
      return;
    }
    const { error: updateError } = await supabaseBrowser
      .from('users')
      .update({ role })
      .eq('id', data.id);
    if (updateError) {
      setStatus(updateError.message);
      return;
    }
    setStatus(`Роль обновлена на ${role}`);
  };

  if (!supabaseBrowser) {
    return <AuthPanel />;
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <strong>Назначить роль</strong>
      <input
        style={inputStyle}
        placeholder="Email пользователя"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <select value={role} onChange={(e) => setRole(e.target.value)} style={inputStyle}>
        <option value="barber">Мастер</option>
        <option value="admin">Администратор</option>
        <option value="client">Клиент</option>
      </select>
      <button className="button secondary" onClick={updateRole}>
        Сохранить роль
      </button>
      {status ? <p>{status}</p> : null}
    </div>
  );
}

const inputStyle: CSSProperties = {
  padding: '10px 12px',
  borderRadius: 12,
  border: '1px solid #e6d2be',
  background: '#fff',
  fontSize: 14
};
