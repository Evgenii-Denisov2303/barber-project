-- Notification delivery logs

create table notification_logs (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references locations(id) on delete set null,
  appointment_id uuid references appointments(id) on delete set null,
  barber_id uuid references barbers(id) on delete set null,
  channel text not null,
  recipient text,
  status text not null check (status in ('sent', 'error', 'skipped')),
  detail text,
  meta jsonb,
  created_at timestamptz default now()
);

create index notification_logs_location_idx on notification_logs (location_id, created_at desc);
create index notification_logs_appointment_idx on notification_logs (appointment_id);

alter table public.notification_logs enable row level security;

create policy "notification logs admin read"
  on public.notification_logs for select
  using (public.is_admin());

create policy "notification logs admin write"
  on public.notification_logs for all
  using (public.is_admin())
  with check (public.is_admin());
