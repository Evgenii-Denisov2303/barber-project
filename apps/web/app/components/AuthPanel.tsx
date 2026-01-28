'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { supabaseBrowser } from '../../lib/supabaseBrowser';

type AuthPanelProps = {
  onAuthChange?: () => void;
};

export function AuthPanel({ onAuthChange }: AuthPanelProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseBrowser) return;
    supabaseBrowser.auth.getSession().then(({ data }) => {
      setSessionEmail(data.session?.user?.email ?? null);
    });
  }, []);

  const signIn = async () => {
    if (!supabaseBrowser) return;
    const { error } = await supabaseBrowser.auth.signInWithPassword({
      email,
      password
    });
    if (error) {
      setStatus(error.message);
      return;
    }
    setStatus('Вход выполнен');
    setSessionEmail(email);
    onAuthChange?.();
  };

  const signUp = async () => {
    if (!supabaseBrowser) return;
    const { error } = await supabaseBrowser.auth.signUp({
      email,
      password
    });
    if (error) {
      setStatus(error.message);
      return;
    }
    setStatus('Аккаунт создан, проверьте почту');
  };

  const signOut = async () => {
    if (!supabaseBrowser) return;
    await supabaseBrowser.auth.signOut();
    setSessionEmail(null);
    setStatus('Вы вышли');
    onAuthChange?.();
  };

  if (!supabaseBrowser) {
    return (
      <div className="card">
        <h3>Авторизация</h3>
        <p>Supabase не настроен. Заполните env‑переменные.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3>Авторизация</h3>
      {sessionEmail ? (
        <>
          <p>Вы вошли как {sessionEmail}</p>
          <button className="button secondary" onClick={signOut}>
            Выйти
          </button>
        </>
      ) : (
        <>
          <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            <input
              placeholder="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
            <input
              placeholder="пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button className="button" onClick={signIn}>
              Войти
            </button>
            <button className="button secondary" onClick={signUp}>
              Регистрация
            </button>
          </div>
        </>
      )}
      {status ? <p style={{ marginTop: 12 }}>{status}</p> : null}
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
