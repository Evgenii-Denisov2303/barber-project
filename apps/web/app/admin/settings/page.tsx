import { SettingsManager } from './settings-manager';
import { RoleManager } from './role-manager';

const hours = [
  { day: 'Понедельник', time: '10:00 – 22:00' },
  { day: 'Вторник', time: '10:00 – 22:00' },
  { day: 'Среда', time: '10:00 – 22:00' },
  { day: 'Четверг', time: '10:00 – 22:00' },
  { day: 'Пятница', time: '10:00 – 22:00' },
  { day: 'Суббота', time: '10:00 – 22:00' },
  { day: 'Воскресенье', time: '10:00 – 22:00' }
];

export default function SettingsPage() {
  return (
    <section className="card">
      <h3>График работы</h3>
      <div className="list" style={{ marginTop: 12 }}>
        {hours.map((item) => (
          <div key={item.day} className="list-item">
            <strong>{item.day}</strong>
            <span className="chip">{item.time}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 20 }}>
        <SettingsManager />
      </div>
      <div style={{ marginTop: 20 }}>
        <RoleManager />
      </div>
    </section>
  );
}
