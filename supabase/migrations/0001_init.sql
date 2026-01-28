-- Istanbul booking schema (Postgres / Supabase)

create extension if not exists "pgcrypto";
create extension if not exists btree_gist;

create table users (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('client','barber','admin')),
  full_name text not null,
  phone text,
  email text,
  created_at timestamptz default now()
);

create table locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  phone text,
  timezone text default 'Europe/Moscow',
  created_at timestamptz default now()
);

create table barbers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  location_id uuid references locations(id) on delete set null,
  bio text,
  rating numeric(2,1),
  is_active boolean default true,
  created_at timestamptz default now()
);

create table services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  duration_min int not null check (duration_min > 0),
  price int not null check (price >= 0),
  is_active boolean default true
);

create table barber_services (
  barber_id uuid references barbers(id) on delete cascade,
  service_id uuid references services(id) on delete cascade,
  primary key (barber_id, service_id)
);

create table working_hours (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references locations(id) on delete cascade,
  weekday int not null check (weekday between 1 and 7),
  open_time time not null,
  close_time time not null
);

create table barber_working_hours (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid references barbers(id) on delete cascade,
  weekday int not null check (weekday between 1 and 7),
  start_time time not null,
  end_time time not null
);

create table time_off (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid references barbers(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  reason text
);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references users(id) on delete set null,
  barber_id uuid references barbers(id) on delete set null,
  service_id uuid references services(id) on delete set null,
  location_id uuid references locations(id) on delete set null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','confirmed','cancelled','completed','no_show')),
  source text default 'app' check (source in ('app','web','admin')),
  note text,
  created_at timestamptz default now()
);

create index appointments_barber_start_idx on appointments (barber_id, start_at);
create index appointments_client_start_idx on appointments (client_id, start_at);
create index appointments_location_start_idx on appointments (location_id, start_at);

alter table appointments
  add constraint appointments_end_after_start check (end_at > start_at);

-- Prevent overlapping active appointments for the same barber
alter table appointments
  add constraint appointments_no_overlap
  exclude using gist (
    barber_id with =,
    tstzrange(start_at, end_at, '[)') with &&
  )
  where (status in ('pending','confirmed'));

-- Optional: also prevent location-level overlaps (if you want one chair only)
-- alter table appointments add constraint appointments_no_overlap_location
--   exclude using gist (
--     location_id with =,
--     tstzrange(start_at, end_at, '[)') with &&
--   ) where (status in ('pending','confirmed'));
