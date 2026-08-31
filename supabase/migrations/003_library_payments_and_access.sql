-- =============================================================================
-- Library user payments + unified access helpers
-- =============================================================================

-- Library fee catalog (app_settings)
insert into public.app_settings (key, value)
values ('library_fee_amount', jsonb_build_object('amount', 0, 'currency', 'XAF'))
on conflict (key) do nothing;

-- Library user payment ledger
create table if not exists public.library_user_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null check (amount > 0),
  currency text not null default 'XAF',
  payment_method text not null default 'cash' check (
    payment_method in ('cash', 'mobile_money', 'bank_transfer', 'card', 'other')
  ),
  reference text,
  notes text,
  operation_date timestamptz not null default now(),
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  voided_at timestamptz,
  voided_by uuid references public.profiles(id) on delete set null,
  void_reason text
);

create index if not exists idx_library_user_payments_user
  on public.library_user_payments(user_id, operation_date desc);

alter table public.library_user_payments enable row level security;

drop policy if exists "library_user_payments_admin_teacher_all"
  on public.library_user_payments;
create policy "library_user_payments_admin_teacher_all"
  on public.library_user_payments for all to authenticated
  using (public.current_user_role() in ('admin', 'teacher'))
  with check (public.current_user_role() in ('admin', 'teacher'));

-- Tag student course payments with payment type for unified history
alter table public.student_course_payments
  add column if not exists payment_type text not null default 'student_course_fee';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'student_course_payments_payment_type_check'
      and conrelid = 'public.student_course_payments'::regclass
  ) then
    alter table public.student_course_payments
      add constraint student_course_payments_payment_type_check
      check (payment_type in ('student_course_fee'));
  end if;
end $$;

-- Helpers ---------------------------------------------------------------------

create or replace function public.library_fee_amount()
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
      where s.key = 'library_fee_amount'
    ),
    0
  );
$$;

create or replace function public.set_library_fee_amount(p_amount integer, p_currency text default 'XAF')
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() <> 'admin' then
    raise exception 'Only admins can change library fee amount';
  end if;

  if p_amount is null or p_amount < 0 then
    raise exception 'Library fee amount must be >= 0';
  end if;

  insert into public.app_settings (key, value, updated_at, updated_by)
  values (
    'library_fee_amount',
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

create or replace function public.library_user_total_paid(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(p.amount), 0)::integer
  from public.library_user_payments p
  where p.user_id = p_user_id
    and p.voided_at is null;
$$;

create or replace function public.library_user_total_owed(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select greatest(
    public.library_fee_amount() - public.library_user_total_paid(p_user_id),
    0
  );
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
    return public.student_course_total_owed(p_user_id);
  elsif v_role = 'library_user' then
    return public.library_user_total_owed(p_user_id);
  end if;

  return 0;
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

-- Update blocking logic to include library users in automatic mode
create or replace function public.user_is_resource_blocked(p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
  v_access text;
  v_mode text;
  v_owed integer;
begin
  select p.role, p.resource_access
  into v_role, v_access
  from public.profiles p
  where p.id = p_user_id;

  if v_role is null then
    return true;
  end if;

  if v_role in ('admin', 'teacher') then
    return false;
  end if;

  if v_access = 'granted' then
    return false;
  end if;

  if v_access = 'denied' then
    return true;
  end if;

  v_mode := public.access_blocking_mode();

  if v_mode = 'manual' then
    return false;
  end if;

  v_owed := public.user_total_owed(p_user_id);
  return v_owed > 0;
end;
$$;

-- Access status for backoffice UI
create or replace function public.get_user_access_status(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
  v_access text;
  v_mode text;
  v_owed integer;
  v_blocked boolean;
  v_effective text;
begin
  select p.role, p.resource_access
  into v_role, v_access
  from public.profiles p
  where p.id = p_user_id;

  if v_role is null then
    return jsonb_build_object('error', 'user_not_found');
  end if;

  v_mode := public.access_blocking_mode();
  v_owed := public.user_total_owed(p_user_id);
  v_blocked := public.user_is_resource_blocked(p_user_id);

  if v_blocked then
    if v_access = 'denied' then
      v_effective := 'blocked_manual';
    elsif v_mode = 'automatic' and v_owed > 0 then
      v_effective := 'blocked_fees';
    else
      v_effective := 'blocked';
    end if;
  else
    if v_access = 'granted' and v_mode = 'automatic' and v_owed > 0 then
      v_effective := 'allowed_override';
    elsif v_access = 'granted' then
      v_effective := 'allowed_manual';
    else
      v_effective := 'allowed';
    end if;
  end if;

  return jsonb_build_object(
    'role', v_role,
    'resource_access', v_access,
    'access_blocking_mode', v_mode,
    'total_owed', v_owed,
    'is_blocked', v_blocked,
    'effective_state', v_effective
  );
end;
$$;

-- Unified payment history view
create or replace view public.v_user_payment_history as
select
  p.id,
  p.student_id as user_id,
  'student_course_fee'::text as payment_type,
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

grant execute on function public.library_fee_amount() to authenticated;
grant execute on function public.set_library_fee_amount(integer, text) to authenticated;
grant execute on function public.library_user_total_paid(uuid) to authenticated;
grant execute on function public.library_user_total_owed(uuid) to authenticated;
grant execute on function public.user_total_owed(uuid) to authenticated;
grant execute on function public.record_library_user_payment(uuid, integer, text, text, text, text, timestamptz) to authenticated;
grant execute on function public.get_user_access_status(uuid) to authenticated;

grant select on public.v_user_payment_history to authenticated;
grant select on public.v_student_course_payment_summary to authenticated;
