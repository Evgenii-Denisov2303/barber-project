-- Ensure appointment creation/reschedule respects working hours and time off

create or replace function rpc_create_appointment(
  p_service_id uuid,
  p_barber_id uuid,
  p_start_at timestamptz,
  p_client_id uuid default null,
  p_location_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_duration int;
  v_end timestamptz;
  v_id uuid;
  v_client_id uuid;
  v_location_id uuid;
  v_timezone text;
  v_open time;
  v_close time;
  v_weekday int;
  v_local_start timestamp;
  v_local_end timestamp;
begin
  select duration_min into v_duration
  from services
  where id = p_service_id and is_active = true;

  if v_duration is null then
    raise exception 'service_not_found';
  end if;

  select location_id into v_location_id
  from barbers
  where id = p_barber_id and is_active = true;

  if v_location_id is null then
    v_location_id := p_location_id;
  end if;

  if v_location_id is null then
    raise exception 'location_not_found';
  end if;

  select timezone into v_timezone
  from locations
  where id = v_location_id;

  if v_timezone is null then
    v_timezone := 'Europe/Moscow';
  end if;

  v_end := p_start_at + make_interval(mins => v_duration);
  v_local_start := (p_start_at at time zone v_timezone);
  v_local_end := (v_end at time zone v_timezone);

  if v_local_end::date <> v_local_start::date then
    raise exception 'outside_working_hours';
  end if;

  v_weekday := extract(isodow from v_local_start);

  select
    coalesce(bwh.start_time, wh.open_time),
    coalesce(bwh.end_time, wh.close_time)
  into v_open, v_close
  from barbers b
  left join barber_working_hours bwh
    on bwh.barber_id = b.id and bwh.weekday = v_weekday
  left join working_hours wh
    on wh.location_id = v_location_id and wh.weekday = v_weekday
  where b.id = p_barber_id and b.is_active = true;

  if v_open is null or v_close is null then
    raise exception 'outside_working_hours';
  end if;

  if not (v_local_start::time >= v_open and v_local_end::time <= v_close) then
    raise exception 'outside_working_hours';
  end if;

  if exists (
    select 1
    from time_off t
    where t.barber_id = p_barber_id
      and tstzrange(t.start_at, t.end_at, '[)') && tstzrange(p_start_at, v_end, '[)')
  ) then
    raise exception 'barber_unavailable';
  end if;

  v_client_id := coalesce(p_client_id, auth.uid());

  if v_client_id is null then
    raise exception 'unauthorized';
  end if;

  if not public.is_admin() and v_client_id <> auth.uid() then
    raise exception 'forbidden';
  end if;

  insert into appointments (
    client_id,
    barber_id,
    service_id,
    location_id,
    start_at,
    end_at,
    status,
    source
  )
  values (
    v_client_id,
    p_barber_id,
    p_service_id,
    v_location_id,
    p_start_at,
    v_end,
    'pending',
    'app'
  )
  returning id into v_id;

  return v_id;
exception
  when exclusion_violation then
    raise exception 'slot_taken';
end;
$$;

create or replace function rpc_reschedule_appointment(
  p_appointment_id uuid,
  p_new_start_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service_id uuid;
  v_barber_id uuid;
  v_duration int;
  v_new_end timestamptz;
  v_client_id uuid;
  v_location_id uuid;
  v_timezone text;
  v_open time;
  v_close time;
  v_weekday int;
  v_local_start timestamp;
  v_local_end timestamp;
begin
  select service_id, barber_id, client_id, location_id
    into v_service_id, v_barber_id, v_client_id, v_location_id
  from appointments
  where id = p_appointment_id;

  if v_service_id is null then
    raise exception 'appointment_not_found';
  end if;

  if not public.is_admin()
     and v_client_id <> auth.uid()
     and v_barber_id not in (select id from barbers where user_id = auth.uid()) then
    raise exception 'forbidden';
  end if;

  select duration_min into v_duration
  from services
  where id = v_service_id and is_active = true;

  if v_duration is null then
    raise exception 'service_not_found';
  end if;

  select location_id into v_location_id
  from barbers
  where id = v_barber_id and is_active = true;

  if v_location_id is null then
    raise exception 'location_not_found';
  end if;

  select timezone into v_timezone
  from locations
  where id = v_location_id;

  if v_timezone is null then
    v_timezone := 'Europe/Moscow';
  end if;

  v_new_end := p_new_start_at + make_interval(mins => v_duration);
  v_local_start := (p_new_start_at at time zone v_timezone);
  v_local_end := (v_new_end at time zone v_timezone);

  if v_local_end::date <> v_local_start::date then
    raise exception 'outside_working_hours';
  end if;

  v_weekday := extract(isodow from v_local_start);

  select
    coalesce(bwh.start_time, wh.open_time),
    coalesce(bwh.end_time, wh.close_time)
  into v_open, v_close
  from barbers b
  left join barber_working_hours bwh
    on bwh.barber_id = b.id and bwh.weekday = v_weekday
  left join working_hours wh
    on wh.location_id = v_location_id and wh.weekday = v_weekday
  where b.id = v_barber_id and b.is_active = true;

  if v_open is null or v_close is null then
    raise exception 'outside_working_hours';
  end if;

  if not (v_local_start::time >= v_open and v_local_end::time <= v_close) then
    raise exception 'outside_working_hours';
  end if;

  if exists (
    select 1
    from time_off t
    where t.barber_id = v_barber_id
      and tstzrange(t.start_at, t.end_at, '[)') && tstzrange(p_new_start_at, v_new_end, '[)')
  ) then
    raise exception 'barber_unavailable';
  end if;

  update appointments
  set start_at = p_new_start_at,
      end_at = v_new_end,
      status = 'pending'
  where id = p_appointment_id
  returning id into v_service_id;

  return v_service_id;
exception
  when exclusion_violation then
    raise exception 'slot_taken';
end;
$$;
