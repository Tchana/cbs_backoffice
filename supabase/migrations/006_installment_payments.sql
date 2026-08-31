-- =============================================================================
-- Installment payments: partial payments toward school / library fees
-- =============================================================================

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
  v_fee integer;
  v_remaining integer;
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

  v_fee := public.school_fee_amount();
  v_remaining := public.student_school_total_owed(p_student_id);

  if v_fee > 0 and v_remaining <= 0 then
    raise exception 'School fee is already fully paid';
  end if;

  if v_fee > 0 and p_amount > v_remaining then
    raise exception 'Installment amount % XAF exceeds remaining balance % XAF',
      p_amount, v_remaining;
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

create or replace function public.record_library_user_payment(
  p_user_id uuid,
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
  v_fee integer;
  v_remaining integer;
begin
  if public.current_user_role() not in ('admin', 'teacher') then
    raise exception 'Not authorized';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be > 0';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = p_user_id and p.role = 'library_user'
  ) then
    raise exception 'Library user not found';
  end if;

  v_fee := public.library_fee_amount();
  v_remaining := public.library_user_total_owed(p_user_id);

  if v_fee > 0 and v_remaining <= 0 then
    raise exception 'Library fee is already fully paid';
  end if;

  if v_fee > 0 and p_amount > v_remaining then
    raise exception 'Installment amount % XAF exceeds remaining balance % XAF',
      p_amount, v_remaining;
  end if;

  insert into public.library_user_payments (
    user_id, amount, currency, payment_method, reference, notes,
    operation_date, paid_at, created_by
  )
  values (
    p_user_id, p_amount, coalesce(nullif(trim(p_currency), ''), 'XAF'),
    coalesce(nullif(trim(p_payment_method), ''), 'cash'),
    p_reference, p_notes, p_operation_date, now(), auth.uid()
  )
  returning id into v_payment_id;

  return v_payment_id;
end;
$$;

create or replace view public.v_library_user_payment_summary as
select
  p.id as user_id,
  public.library_fee_amount() as fee_amount,
  'XAF'::text as currency,
  public.library_user_total_paid(p.id) as total_paid,
  public.library_user_total_owed(p.id) as total_owed
from public.profiles p
where p.role = 'library_user';

drop view if exists public.v_user_payment_history;

create view public.v_user_payment_history as
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
  p.voided_at,
  row_number() over (
    partition by p.student_id
    order by p.operation_date asc, p.created_at asc, p.id asc
  )::integer as installment_number
from public.student_course_payments p
where p.voided_at is null
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
  p.voided_at,
  row_number() over (
    partition by p.user_id
    order by p.operation_date asc, p.created_at asc, p.id asc
  )::integer as installment_number
from public.library_user_payments p
where p.voided_at is null;

grant select on public.v_library_user_payment_summary to authenticated;
grant select on public.v_user_payment_history to authenticated;
