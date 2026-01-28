import { BarberManager } from './barber-manager';

export default function BarbersPage() {
  return (
    <section className="card">
      <h3>Мастера</h3>
      <div style={{ marginTop: 20 }}>
        <BarberManager initial={[]} />
      </div>
    </section>
  );
}
