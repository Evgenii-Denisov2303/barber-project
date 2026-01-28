-- RPC functions for availability and appointment creation

create or replace function rpc_get_availability(
  p_date date,
  p_service_id uuid,
  p_barber_id uuid,
  p_step_min int default 30
)
returns table (slot_start timestamptz, slot_end timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_duration int;
  v_open time;
  v_close time;
  v_weekday int;
begin
  select duration_min into v_duration
  from services
  where id = p_service_id and is_active = true;

  if v_duration is null then
    raise exception 'service_not_found';
  end if;

  v_weekday := extract(isodow from p_date);

  select
    coalesce(bwh.start_time, wh.open_time),
    coalesce(bwh.end_time, wh.close_time)
  into v_open, v_close
  from barbers b
  left join barber_working_hours bwh
    on bwh.barber_id = b.id and bwh.weekday = v_weekday
  left join working_hours wh
    on wh.location_id = b.location_id and wh.weekday = v_weekday
  where b.id = p_barber_id and b.is_active = true;

  if v_open is null or v_close is null then
    return;
  end if;

  return query
  with slots as (
    select
      (p_date::timestamp + v_open) + (g * (p_step_min || ' minutes')::interval) as slot_start,
      (p_date::timestamp + v_open) + (g * (p_step_min || ' minutes')::interval) + (v_duration || ' minutes')::interval as slot_end
    from generate_series(
      0,
      floor(
        extract(epoch from ((p_date::timestamp + v_close) - (p_date::timestamp + v_open) - (v_duration || ' minutes')::interval))
        / (p_step_min * 60)
      )::int
    ) as g
  )
  select s.slot_start::timestamptz, s.slot_end::timestamptz
  from slots s
  where not exists (
    select 1 from appointments a
    where a.barber_id = p_barber_id
      and a.status in ('pending','confirmed')
      and tstzrange(a.start_at, a.end_at, '[)') && tstzrange(s.slot_start, s.slot_end, '[)')
  )
  and not exists (
    select 1 from time_off t
    where t.barber_id = p_barber_id
      and tstzrange(t.start_at, t.end_at, '[)') && tstzrange(s.slot_start, s.slot_end, '[)')
  );
end;
$$;

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
begin
  select duration_min into v_duration
  from services
  where id = p_service_id and is_active = true;

  if v_duration is null then
    raise exception 'service_not_found';
  end if;

  v_end := p_start_at + make_interval(mins => v_duration);
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
    p_location_id,
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
