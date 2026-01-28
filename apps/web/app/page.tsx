const stats = [
  { label: 'Сегодня записей', value: '14' },
  { label: 'Свободные слоты', value: '6' },
  { label: 'Новые клиенты', value: '3' }
];

const upcoming = [
  { time: '12:30', client: 'Сергей М.', service: 'Стрижка + борода' },
  { time: '13:30', client: 'Илья С.', service: 'Мужская стрижка' },
  { time: '15:00', client: 'Айрат Н.', service: 'Оформление бороды' }
];

import Link from 'next/link';

export default function Page() {
  return (
    <main>
      <section className="hero">
        <span className="badge">Istanbul · мастерская запись</span>
        <h1 className="hero-title">Панель мастера</h1>
        <p className="hero-subtitle">
          Смотрите расписание, подтверждайте записи и управляйте своим днём в
          одном месте.
        </p>
        <div className="hero-actions">
          <Link className="button" href="/dashboard">
            Войти как мастер
          </Link>
          <Link className="button secondary" href="/admin">
            Войти как админ
          </Link>
        </div>
      </section>

      <section className="grid">
        <div className="card">
          <h3>Сегодня</h3>
          <p>Рабочий день 10:00–22:00 · 6 мастеров</p>
          <div className="stats" style={{ marginTop: 16 }}>
            {stats.map((stat) => (
              <div className="stat" key={stat.label}>
                <span>{stat.label}</span>
                <h3 style={{ margin: '8px 0 0', fontSize: 22 }}>{stat.value}</h3>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3>Ближайшие записи</h3>
          <div className="list" style={{ marginTop: 12 }}>
            {upcoming.map((item) => (
              <div className="list-item" key={`${item.time}-${item.client}`}>
                <div>
                  <strong>{item.time}</strong>
                  <span>{item.client}</span>
                  <p>{item.service}</p>
                </div>
                <span className="chip">подтвердить</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
