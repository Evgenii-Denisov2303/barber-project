-- Auth + RLS setup

-- Helper role checks
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_barber()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'barber'
  );
$$;

create or replace function public.is_client()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'client'
  );
$$;

-- Auto-create public.users from auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, role, full_name, phone, email)
  values (
    new.id,
    'client',
    coalesce(new.raw_user_meta_data->>'full_name', 'Клиент'),
    new.phone,
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Trigger on auth.users
create or replace trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Enable RLS
alter table public.users enable row level security;
alter table public.locations enable row level security;
alter table public.barbers enable row level security;
alter table public.services enable row level security;
alter table public.barber_services enable row level security;
alter table public.working_hours enable row level security;
alter table public.barber_working_hours enable row level security;
alter table public.time_off enable row level security;
alter table public.appointments enable row level security;

-- Users policies
create policy "users read own"
  on public.users for select
  using (id = auth.uid() or public.is_admin());

create policy "users update own"
  on public.users for update
  using (id = auth.uid() or public.is_admin());

create policy "users admin insert"
  on public.users for insert
  with check (public.is_admin());

-- Locations
create policy "locations read"
  on public.locations for select
  using (true);

create policy "locations admin write"
  on public.locations for all
  using (public.is_admin())
  with check (public.is_admin());

-- Services
create policy "services read"
  on public.services for select
  using (true);

create policy "services admin write"
  on public.services for all
  using (public.is_admin())
  with check (public.is_admin());

-- Barbers
create policy "barbers read"
  on public.barbers for select
  using (true);

create policy "barbers admin write"
  on public.barbers for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "barbers self update"
  on public.barbers for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Barber services
create policy "barber_services read"
  on public.barber_services for select
  using (true);

create policy "barber_services admin write"
  on public.barber_services for all
  using (public.is_admin())
  with check (public.is_admin());

-- Working hours
create policy "working_hours read"
  on public.working_hours for select
  using (true);

create policy "working_hours admin write"
  on public.working_hours for all
  using (public.is_admin())
  with check (public.is_admin());

-- Barber working hours
create policy "barber_working_hours read"
  on public.barber_working_hours for select
  using (true);

create policy "barber_working_hours admin write"
  on public.barber_working_hours for all
  using (public.is_admin())
  with check (public.is_admin());

-- Time off
create policy "time_off read"
  on public.time_off for select
  using (true);

create policy "time_off admin write"
  on public.time_off for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "time_off barber write"
  on public.time_off for all
  using (barber_id in (select id from public.barbers where user_id = auth.uid()))
  with check (barber_id in (select id from public.barbers where user_id = auth.uid()));

-- Appointments
create policy "appointments read"
  on public.appointments for select
  using (
    public.is_admin()
    or client_id = auth.uid()
    or barber_id in (select id from public.barbers where user_id = auth.uid())
  );

create policy "appointments insert"
  on public.appointments for insert
  with check (
    public.is_admin() or client_id = auth.uid()
  );

create policy "appointments update"
  on public.appointments for update
  using (
    public.is_admin()
    or client_id = auth.uid()
    or barber_id in (select id from public.barbers where user_id = auth.uid())
  )
  with check (
    public.is_admin()
    or client_id = auth.uid()
    or barber_id in (select id from public.barbers where user_id = auth.uid())
  );
