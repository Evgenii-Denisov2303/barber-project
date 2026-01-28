-- Reschedule appointment with overlap check

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
begin
  select service_id, barber_id, client_id
    into v_service_id, v_barber_id, v_client_id
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

  v_new_end := p_new_start_at + make_interval(mins => v_duration);

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
