import { AuthGate } from '../components/AuthGate';
import { AdminNav } from './admin-nav';

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
      </section>
      <AdminNav />
      <AuthGate requiredRole="admin">{children}</AuthGate>
    </main>
  );
}
