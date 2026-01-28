import Link from 'next/link';
import { AuthGate } from '../components/AuthGate';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="admin">
      <section className="hero">
        <span className="badge">Istanbul · админка</span>
        <h1 className="hero-title">Панель администратора</h1>
        <p className="hero-subtitle">
          Управляйте мастерами, услугами и записями. Вся операционная работа
          салона — в одном окне.
        </p>
        <div className="hero-actions">
          <Link className="button" href="/admin/appointments">
            Записи
          </Link>
          <Link className="button secondary" href="/admin/calendar">
            Календарь
          </Link>
          <Link className="button secondary" href="/admin/services">
            Услуги
          </Link>
          <Link className="button secondary" href="/admin/barbers">
            Мастера
          </Link>
          <Link className="button secondary" href="/admin/settings">
            Настройки
          </Link>
        </div>
      </section>
      <AuthGate requiredRole="admin">{children}</AuthGate>
    </main>
  );
}
