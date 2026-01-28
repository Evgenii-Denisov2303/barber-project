export type Role = 'client' | 'barber' | 'admin';

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'no_show';

export type Service = {
  id: string;
  name: string;
  durationMin: number;
  price: number;
  isActive: boolean;
};

export type Barber = {
  id: string;
  fullName: string;
  rating?: number;
  bio?: string;
  isActive: boolean;
};

export type Appointment = {
  id: string;
  clientId: string | null;
  barberId: string | null;
  serviceId: string | null;
  locationId: string | null;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  note?: string | null;
};

export type WorkingHours = {
  weekday: number; // 1..7
  openTime: string; // HH:mm
  closeTime: string; // HH:mm
};

export type TimeOff = {
  id: string;
  barberId: string;
  startAt: string;
  endAt: string;
  reason?: string | null;
};
