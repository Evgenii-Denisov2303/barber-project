'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '../../lib/supabaseBrowser';

const navItems = [
  { href: '/admin/appointments', label: 'Записи' },
  { href: '/admin/calendar', label: 'Календарь' },
  { href: '/admin/services', label: 'Услуги' },
  { href: '/admin/barbers', label: 'Мастера' },
  { href: '/admin/settings', label: 'Настройки' }
];

export function AdminNav() {
  const pathname = usePathname();
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseBrowser) return;
    const syncSession = async () => {
      const { data } = await supabaseBrowser.auth.getSession();
      setSessionEmail(data.session?.user?.email ?? null);
    };
    syncSession();
    const { data: listener } = supabaseBrowser.auth.onAuthStateChange(() => {
      syncSession();
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    if (!supabaseBrowser) return;
    await supabaseBrowser.auth.signOut();
  };

  return (
    <nav className="admin-nav" aria-label="Админка">
      <div className="admin-nav-inner">
        <div className="admin-nav-actions">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (pathname?.startsWith(item.href + '/') ?? false);
            const className = [
              'button',
              'nav-button',
              isActive ? 'is-active' : ''
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <Link
                key={item.href}
                className={className}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
        {sessionEmail ? (
          <div className="admin-nav-user">
            <span className="admin-nav-email" title={sessionEmail}>
              {sessionEmail}
            </span>
            <button className="button secondary" onClick={signOut}>
              Выйти
            </button>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
