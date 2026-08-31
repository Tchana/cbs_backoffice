-- =============================================================================
-- Students pay a flat school fee (not per-course fees)
-- =============================================================================

insert into public.app_settings (key, value)
values ('school_fee_amount', jsonb_build_object('amount', 0, 'currency', 'XAF'))
on conflict (key) do nothing;

-- Normalize legacy payment type labels
alter table public.student_course_payments
  drop constraint if exists student_course_payments_payment_type_check;

update public.student_course_payments
set payment_type = 'school_fee'
where payment_type = 'student_course_fee';

alter table public.student_course_payments
  add constraint student_course_payments_payment_type_check
  check (payment_type in ('school_fee', 'student_course_fee'));

-- -----------------------------------------------------------------------------

create or replace function public.school_fee_amount()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select (s.value->>'amount')::integer
      from public.app_settings s
      where s.key = 'school_fee_amount'
    ),
    0
  );
$$;

create or replace function public.set_school_fee_amount(p_amount integer, p_currency text default 'XAF')
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() <> 'admin' then
    raise exception 'Only admins can change school fee amount';
  end if;

  if p_amount is null or p_amount < 0 then
    raise exception 'School fee amount must be >= 0';
  end if;

  insert into public.app_settings (key, value, updated_at, updated_by)
  values (
    'school_fee_amount',
    jsonb_build_object('amount', p_amount, 'currency', coalesce(nullif(trim(p_currency), ''), 'XAF')),
    now(),
    auth.uid()
  )
  on conflict (key) do update
  set value = jsonb_build_object('amount', p_amount, 'currency', coalesce(nullif(trim(p_currency), ''), 'XAF')),
      updated_at = now(),
      updated_by = auth.uid();
end;
$$;

create or replace function public.student_school_total_paid(p_student_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(p.amount), 0)::integer
  from public.student_course_payments p
  where p.student_id = p_student_id
    and p.voided_at is null;
$$;

create or replace function public.student_school_total_owed(p_student_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select greatest(
    public.school_fee_amount() - public.student_school_total_paid(p_student_id),
    0
  );
$$;

-- Backward-compatible alias used by older RPCs
create or replace function public.student_course_total_owed(p_student_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select public.student_school_total_owed(p_student_id);
$$;

create or replace function public.record_student_school_payment(
  p_student_id uuid,
  p_amount integer,
  p_currency text default 'XAF',
  p_payment_method text default 'cash',
  p_reference text default null,
  p_notes text default null,
  p_operation_date timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment_id uuid;
begin
  if public.current_user_role() not in ('admin', 'teacher') then
    raise exception 'Not authorized';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be > 0';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = p_student_id and p.role = 'student'
  ) then
    raise exception 'Student not found';
  end if;

  insert into public.student_course_payments (
    student_id, amount, currency, payment_method, reference, notes,
    payment_type, operation_date, paid_at, created_by
  )
  values (
    p_student_id, p_amount, coalesce(nullif(trim(p_currency), ''), 'XAF'),
    coalesce(nullif(trim(p_payment_method), ''), 'cash'),
    p_reference, p_notes, 'school_fee', p_operation_date, now(), auth.uid()
  )
  returning id into v_payment_id;

  return v_payment_id;
end;
$$;

-- Keep RPC name for existing clients; no per-course allocation
create or replace function public.record_student_course_payment(
  p_student_id uuid,
  p_amount integer,
  p_allocations jsonb default '[]'::jsonb,
  p_currency text default 'XAF',
  p_payment_method text default 'cash',
  p_reference text default null,
  p_notes text default null,
  p_operation_date timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.record_student_school_payment(
    p_student_id, p_amount, p_currency, p_payment_method,
    p_reference, p_notes, p_operation_date
  );
end;
$$;

create or replace function public.user_total_owed(p_user_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select role into v_role from public.profiles where id = p_user_id;

  if v_role = 'student' then
    return public.student_school_total_owed(p_user_id);
  elsif v_role = 'library_user' then
    return public.library_user_total_owed(p_user_id);
  end if;

  return 0;
end;
$$;

create or replace function public.user_is_course_blocked(p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
  v_mode text;
begin
  select p.role into v_role from public.profiles p where p.id = p_user_id;

  if v_role is null then
    return true;
  end if;

  if v_role in ('admin', 'teacher') then
    return false;
  end if;

  if v_role <> 'student' then
    return true;
  end if;

  if public.user_access_override_allows(p_user_id) then
    return false;
  end if;

  if public.user_access_override_blocks(p_user_id) then
    return true;
  end if;

  v_mode := public.access_blocking_mode();
  if v_mode = 'manual' then
    return false;
  end if;

  return public.student_school_total_owed(p_user_id) > 0;
end;
$$;

create or replace view public.v_student_school_payment_summary as
select
  p.id as student_id,
  public.school_fee_amount() as fee_amount,
  'XAF'::text as currency,
  public.student_school_total_paid(p.id) as total_paid,
  public.student_school_total_owed(p.id) as total_owed
from public.profiles p
where p.role = 'student';

drop view if exists public.v_student_course_payment_summary;

create view public.v_student_course_payment_summary as
select
  p.id as student_id,
  p.first_name,
  p.last_name,
  p.email,
  s.fee_amount as total_course_price,
  s.total_paid as total_allocated,
  s.total_owed,
  s.total_paid as total_deposits,
  greatest(s.total_paid - s.fee_amount, 0) as credit_balance,
  (
    select max(pay.operation_date)
    from public.student_course_payments pay
    where pay.student_id = p.id
      and pay.voided_at is null
  ) as last_payment_at,
  s.fee_amount,
  s.currency,
  s.total_paid
from public.profiles p
left join public.v_student_school_payment_summary s on s.student_id = p.id
where p.role = 'student';

create or replace view public.v_user_payment_history as
select
  p.id,
  p.student_id as user_id,
  'school_fee'::text as payment_type,
  p.amount,
  p.currency,
  p.payment_method,
  p.reference,
  p.notes,
  p.operation_date,
  p.paid_at,
  p.created_at,
  p.voided_at
from public.student_course_payments p
union all
select
  p.id,
  p.user_id,
  'library_fee'::text as payment_type,
  p.amount,
  p.currency,
  p.payment_method,
  p.reference,
  p.notes,
  p.operation_date,
  p.paid_at,
  p.created_at,
  p.voided_at
from public.library_user_payments p;

create or replace function public.get_my_course_total_owed()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select public.student_school_total_owed(auth.uid());
$$;

create or replace function public.get_my_school_total_owed()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select public.student_school_total_owed(auth.uid());
$$;

grant execute on function public.school_fee_amount() to authenticated;
grant execute on function public.set_school_fee_amount(integer, text) to authenticated;
grant execute on function public.student_school_total_paid(uuid) to authenticated;
grant execute on function public.student_school_total_owed(uuid) to authenticated;
grant execute on function public.record_student_school_payment(uuid, integer, text, text, text, text, timestamptz) to authenticated;
grant execute on function public.get_my_school_total_owed() to authenticated;

grant select on public.v_student_school_payment_summary to authenticated;
