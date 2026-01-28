'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { supabaseBrowser } from '../../lib/supabaseBrowser';
import { AuthPanel } from './AuthPanel';

type AuthGateProps = {
  requiredRole?: 'admin' | 'barber';
  children: ReactNode;
};

export function AuthGate({ requiredRole, children }: AuthGateProps) {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState(false);

  const loadRole = async () => {
    if (!supabaseBrowser) {
      setLoading(false);
      return;
    }
    const { data } = await supabaseBrowser.auth.getSession();
    const userId = data.session?.user?.id;
    setHasSession(Boolean(userId));
    if (!userId) {
      setRole(null);
      setLoading(false);
      return;
    }
    const { data: roleData } = await supabaseBrowser
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    setRole(roleData?.role ?? null);
    setLoading(false);
  };

  useEffect(() => {
    loadRole();
    if (!supabaseBrowser) return;
    const { data: listener } = supabaseBrowser.auth.onAuthStateChange(() => {
      loadRole();
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (!supabaseBrowser) {
    return <AuthPanel />;
  }

  if (loading) {
    return (
      <div className="card">
        <h3>Авторизация</h3>
        <p>Загрузка...</p>
      </div>
    );
  }

  if (!hasSession) {
    return <AuthPanel onAuthChange={loadRole} />;
  }

  if (requiredRole) {
    const allowed = role === requiredRole || role === 'admin';
    if (!allowed) {
      return (
        <div className="card">
          <h3>Доступ ограничен</h3>
          <p>Текущая роль: {role ?? 'unknown'}. Нужна роль {requiredRole}.</p>
          <AuthPanel onAuthChange={loadRole} />
        </div>
      );
    }
  }

  return <>{children}</>;
}
