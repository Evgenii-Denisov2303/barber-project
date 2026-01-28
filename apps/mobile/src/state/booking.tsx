import React, { createContext, useContext, useMemo, useState } from 'react';
import { barbers, services } from '../data/demo';

export type BookingDraft = {
  serviceId?: string;
  serviceName?: string;
  barberId?: string;
  barberName?: string;
  date?: string;
  slot?: string;
};

export type BookingRecord = {
  id: string;
  serviceName: string;
  barberName: string;
  date: string;
  time: string;
  status: 'confirmed' | 'cancelled' | 'pending';
};

type BookingContextValue = {
  draft: BookingDraft;
  bookings: BookingRecord[];
  setService: (id: string, name: string) => void;
  setBarber: (id: string, name: string) => void;
  setDate: (date: string) => void;
  setSlot: (slot: string) => void;
  resetDraft: () => void;
  createBooking: (id?: string) => BookingRecord | null;
  cancelBooking: (id: string) => void;
};

const BookingContext = createContext<BookingContextValue | null>(null);

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<BookingDraft>({});
  const [bookings, setBookings] = useState<BookingRecord[]>([]);

  const value = useMemo<BookingContextValue>(
    () => ({
      draft,
      bookings,
      setService: (id, name) =>
        setDraft((prev) => ({ ...prev, serviceId: id, serviceName: name })),
      setBarber: (id, name) =>
        setDraft((prev) => ({ ...prev, barberId: id, barberName: name })),
      setDate: (date) => setDraft((prev) => ({ ...prev, date })),
      setSlot: (slot) => setDraft((prev) => ({ ...prev, slot })),
      resetDraft: () => setDraft({}),
      createBooking: (id) => {
        if (!draft.serviceId || !draft.barberId || !draft.date || !draft.slot) {
          return null;
        }
        const serviceName =
          draft.serviceName ??
          services.find((item) => item.id === draft.serviceId)?.name;
        const barberName =
          draft.barberName ??
          barbers.find((item) => item.id === draft.barberId)?.name;
        if (!serviceName || !barberName) return null;
        const record: BookingRecord = {
          id: id ?? String(Date.now()),
          serviceName,
          barberName,
          date: draft.date,
          time: draft.slot,
          status: 'pending'
        };
        setBookings((prev) => [record, ...prev]);
        setDraft({});
        return record;
      },
      cancelBooking: (id) => {
        setBookings((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, status: 'cancelled' } : item
          )
        );
      }
    }),
    [draft, bookings]
  );

  return (
    <BookingContext.Provider value={value}>
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBooking must be used within BookingProvider');
  return ctx;
}
