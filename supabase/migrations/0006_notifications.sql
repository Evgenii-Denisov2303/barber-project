-- Notification settings for channels (Telegram/SMS)

create table notification_settings (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references locations(id) on delete cascade,
  telegram_enabled boolean default false,
  telegram_chat_id text,
  sms_enabled boolean default false,
  sms_sender text,
  created_at timestamptz default now()
);

create unique index notification_settings_location_idx on notification_settings (location_id);

alter table public.notification_settings enable row level security;

create policy "notification settings admin read"
  on public.notification_settings for select
  using (public.is_admin());

create policy "notification settings admin write"
  on public.notification_settings for all
  using (public.is_admin())
  with check (public.is_admin());
