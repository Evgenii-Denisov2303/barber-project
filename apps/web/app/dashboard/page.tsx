import Link from 'next/link';
import { AuthGate } from '../components/AuthGate';
import { BarberSchedule } from './barber-schedule';

export default function DashboardPage() {
  return (
    <main>
      <section className="hero">
        <span className="badge">Istanbul · расписание</span>
        <h1 className="hero-title">Календарь мастера</h1>
        <p className="hero-subtitle">
          Управляйте подтверждениями и следите за загрузкой. Сегодня —
          понедельник, 10:00–22:00.
        </p>
        <div className="hero-actions">
          <button className="button">Открыть смену</button>
          <button className="button secondary">Добавить перерыв</button>
          <Link className="button secondary" href="/admin">
            В админку
          </Link>
          <Link className="button secondary" href="/dashboard/calendar">
            Календарь
          </Link>
        </div>
      </section>

      <AuthGate requiredRole="barber">
        <BarberSchedule />
      </AuthGate>
    </main>
  );
}
