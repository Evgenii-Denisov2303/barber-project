import { CalendarView } from '../../components/CalendarView';
import { AuthGate } from '../../components/AuthGate';

export default function BarberCalendarPage() {
  return (
    <AuthGate requiredRole="barber">
      <CalendarView scope="barber" />
    </AuthGate>
  );
}
