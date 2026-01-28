import { AppointmentManager } from './appointment-manager';

export default function AppointmentsPage() {
  return (
    <section className="card">
      <h3>Записи на сегодня</h3>
      <div style={{ marginTop: 20 }}>
        <AppointmentManager initial={[]} />
      </div>
    </section>
  );
}
