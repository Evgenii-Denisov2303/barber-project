const metrics = [
  { label: 'Записей сегодня', value: '14' },
  { label: 'Свободных слотов', value: '6' },
  { label: 'Новые клиенты', value: '3' },
  { label: 'Отмены', value: '1' }
];

const highlights = [
  {
    title: 'Услуги',
    text: 'Обновите цены и длительности, добавьте новые услуги.'
  },
  {
    title: 'Мастера',
    text: 'Добавьте новые профили и управляйте графиком.'
  },
  {
    title: 'Расписание',
    text: 'Включайте выходные и перерывы без звонков.'
  }
];

export default function AdminPage() {
  return (
    <section className="grid">
      <div className="card">
        <h3>Сегодня</h3>
        <div className="stats" style={{ marginTop: 12 }}>
          {metrics.map((item) => (
            <div key={item.label} className="stat">
              <span>{item.label}</span>
              <h3 style={{ margin: '8px 0 0', fontSize: 22 }}>{item.value}</h3>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <h3>Что можно сделать</h3>
        <div className="list" style={{ marginTop: 12 }}>
          {highlights.map((item) => (
            <div className="list-item" key={item.title}>
              <div>
                <strong>{item.title}</strong>
                <p>{item.text}</p>
              </div>
              <span className="chip">перейти</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
