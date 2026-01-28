import { ServiceManager } from './service-manager';

export default function ServicesPage() {
  return (
    <section className="card">
      <h3>Услуги и цены</h3>
      <div style={{ marginTop: 20 }}>
        <ServiceManager initial={[]} />
      </div>
    </section>
  );
}
