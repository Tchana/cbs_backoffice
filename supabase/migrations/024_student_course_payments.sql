-- =============================================================================
-- Course payments ledger (separate from subscription + legacy student_fee_*)
-- Admin records deposits and manually assigns amounts per course.
-- Unassigned deposit remainder is credit for future courses (by course created_at).
-- =============================================================================

create table if not exists public.student_course_payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
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

create table if not exists public.student_course_payment_allocations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  payment_id uuid references public.student_course_payments(id) on delete set null,
  course_id uuid not null references public.courses(id) on delete restrict,
  amount integer not null check (amount > 0),
  currency text not null default 'XAF',
  source text not null default 'payment' check (source in ('payment', 'credit')),
  operation_date timestamptz not null default now(),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  voided_at timestamptz,
  voided_by uuid references public.profiles(id) on delete set null,
  void_reason text
);

create index if not exists idx_student_course_payments_student
  on public.student_course_payments(student_id, operation_date desc);
create index if not exists idx_student_course_allocations_student
  on public.student_course_payment_allocations(student_id, course_id);
create index if not exists idx_student_course_allocations_payment
  on public.student_course_payment_allocations(payment_id);

alter table public.student_course_payments enable row level security;
alter table public.student_course_payment_allocations enable row level security;

drop policy if exists "student_course_payments_admin_teacher_all"
  on public.student_course_payments;
create policy "student_course_payments_admin_teacher_all"
  on public.student_course_payments for all to authenticated
  using (public.current_user_role() in ('admin', 'teacher'))
  with check (public.current_user_role() in ('admin', 'teacher'));

drop policy if exists "student_course_allocations_admin_teacher_all"
  on public.student_course_payment_allocations;
create policy "student_course_allocations_admin_teacher_all"
  on public.student_course_payment_allocations for all to authenticated
  using (public.current_user_role() in ('admin', 'teacher'))
  with check (public.current_user_role() in ('admin', 'teacher'));

-- Helpers ---------------------------------------------------------------------

create or replace function public.student_course_payment_credit(p_student_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((
      select sum(p.amount)::integer
      from public.student_course_payments p
      where p.student_id = p_student_id
        and p.voided_at is null
    ), 0)
    - coalesce((
      select sum(a.amount)::integer
      from public.student_course_payment_allocations a
      where a.student_id = p_student_id
        and a.voided_at is null
    ), 0);
$$;

create or replace function public.student_course_paid_amount(
  p_student_id uuid,
  p_course_id uuid
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(a.amount), 0)::integer
  from public.student_course_payment_allocations a
  where a.student_id = p_student_id
    and a.course_id = p_course_id
    and a.voided_at is null;
$$;

create or replace function public.student_course_outstanding(
  p_student_id uuid,
  p_course_id uuid
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select greatest(
    coalesce((
      select c.price_amount
      from public.courses c
      where c.id = p_course_id
    ), 0)
    - public.student_course_paid_amount(p_student_id, p_course_id),
    0
  );
$$;

-- Record deposit + manual per-course allocations (remainder = credit) ---------

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
declare
  v_payment_id uuid;
  v_alloc_total integer := 0;
  v_row jsonb;
  v_course_id uuid;
  v_alloc_amount integer;
  v_outstanding integer;
  v_price integer;
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

  for v_row in select * from jsonb_array_elements(coalesce(p_allocations, '[]'::jsonb))
  loop
    v_course_id := nullif(trim(v_row->>'course_id'), '')::uuid;
    v_alloc_amount := (v_row->>'amount')::integer;

    if v_course_id is null or v_alloc_amount is null or v_alloc_amount <= 0 then
      raise exception 'Each allocation needs course_id and a positive amount';
    end if;

    select c.price_amount into v_price
    from public.courses c
    where c.id = v_course_id;

    if v_price is null then
      raise exception 'Course not found: %', v_course_id;
    end if;

    v_outstanding := public.student_course_outstanding(p_student_id, v_course_id);
    if v_alloc_amount > v_outstanding then
      raise exception 'Allocation % XAF exceeds outstanding % XAF for course',
        v_alloc_amount, v_outstanding;
    end if;

    v_alloc_total := v_alloc_total + v_alloc_amount;
  end loop;

  if v_alloc_total > p_amount then
    raise exception 'Total allocated % XAF exceeds payment % XAF', v_alloc_total, p_amount;
  end if;

  insert into public.student_course_payments (
    student_id, amount, currency, payment_method, reference, notes,
    operation_date, paid_at, created_by
  )
  values (
    p_student_id, p_amount, coalesce(nullif(trim(p_currency), ''), 'XAF'),
    coalesce(nullif(trim(p_payment_method), ''), 'cash'),
    p_reference, p_notes, p_operation_date, now(), auth.uid()
  )
  returning id into v_payment_id;

  for v_row in select * from jsonb_array_elements(coalesce(p_allocations, '[]'::jsonb))
  loop
    v_course_id := nullif(trim(v_row->>'course_id'), '')::uuid;
    v_alloc_amount := (v_row->>'amount')::integer;

    insert into public.student_course_payment_allocations (
      student_id, payment_id, course_id, amount, currency, source,
      operation_date, created_by
    )
    values (
      p_student_id, v_payment_id, v_course_id, v_alloc_amount,
      coalesce(nullif(trim(p_currency), ''), 'XAF'),
      'payment', p_operation_date, auth.uid()
    );
  end loop;

  return v_payment_id;
end;
$$;

-- Apply existing credit to a course (no new deposit) --------------------------

create or replace function public.apply_student_course_credit(
  p_student_id uuid,
  p_course_id uuid,
  p_amount integer,
  p_operation_date timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allocation_id uuid;
  v_credit integer;
  v_outstanding integer;
begin
  if public.current_user_role() not in ('admin', 'teacher') then
    raise exception 'Not authorized';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be > 0';
  end if;

  v_credit := public.student_course_payment_credit(p_student_id);
  if p_amount > v_credit then
    raise exception 'Insufficient credit. Available: % XAF', v_credit;
  end if;

  v_outstanding := public.student_course_outstanding(p_student_id, p_course_id);
  if p_amount > v_outstanding then
    raise exception 'Amount exceeds course outstanding balance (% XAF)', v_outstanding;
  end if;

  insert into public.student_course_payment_allocations (
    student_id, payment_id, course_id, amount, currency, source,
    operation_date, created_by
  )
  values (
    p_student_id, null, p_course_id, p_amount, 'XAF', 'credit',
    p_operation_date, auth.uid()
  )
  returning id into v_allocation_id;

  return v_allocation_id;
end;
$$;

-- Void payment (cascades void on its allocations) ----------------------------

create or replace function public.void_student_course_payment(
  p_payment_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() not in ('admin', 'teacher') then
    raise exception 'Not authorized';
  end if;

  update public.student_course_payments
  set voided_at = now(), voided_by = auth.uid(), void_reason = p_reason
  where id = p_payment_id and voided_at is null;

  update public.student_course_payment_allocations
  set voided_at = now(), voided_by = auth.uid(), void_reason = coalesce(p_reason, 'Payment voided')
  where payment_id = p_payment_id and voided_at is null;
end;
$$;

create or replace function public.void_student_course_allocation(
  p_allocation_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() not in ('admin', 'teacher') then
    raise exception 'Not authorized';
  end if;

  update public.student_course_payment_allocations
  set voided_at = now(), voided_by = auth.uid(), void_reason = p_reason
  where id = p_allocation_id and voided_at is null;
end;
$$;

-- Views -----------------------------------------------------------------------

create or replace view public.v_student_course_payment_summary as
select
  p.id as student_id,
  p.first_name,
  p.last_name,
  p.email,
  coalesce(bal.total_course_price, 0) as total_course_price,
  coalesce(bal.total_allocated, 0) as total_allocated,
  coalesce(bal.total_owed, 0) as total_owed,
  coalesce(pay_totals.total_deposits, 0) as total_deposits,
  coalesce(pay_totals.total_deposits, 0) - coalesce(bal.total_allocated, 0) as credit_balance,
  pay_totals.last_payment_at
from public.profiles p
left join (
  select
    s.id as student_id,
    sum(c.price_amount)::integer as total_course_price,
    coalesce(sum(paid.amount_paid), 0)::integer as total_allocated,
    sum(greatest(c.price_amount - coalesce(paid.amount_paid, 0), 0))::integer as total_owed
  from public.profiles s
  cross join public.courses c
  left join (
    select
      a.student_id,
      a.course_id,
      sum(a.amount)::integer as amount_paid
    from public.student_course_payment_allocations a
    where a.voided_at is null
    group by a.student_id, a.course_id
  ) paid on paid.student_id = s.id and paid.course_id = c.id
  where s.role = 'student'
    and coalesce(c.active, true) = true
  group by s.id
) bal on bal.student_id = p.id
left join (
  select
    pay.student_id,
    sum(pay.amount)::integer as total_deposits,
    max(pay.operation_date) as last_payment_at
  from public.student_course_payments pay
  where pay.voided_at is null
  group by pay.student_id
) pay_totals on pay_totals.student_id = p.id
where p.role = 'student';

create or replace view public.v_student_course_balances as
select
  s.student_id,
  c.id as course_id,
  c.title as course_title,
  c.created_at as course_created_at,
  c.price_amount as course_price,
  c.currency,
  coalesce(paid.amount_paid, 0)::integer as amount_paid,
  greatest(c.price_amount - coalesce(paid.amount_paid, 0), 0)::integer as balance_due
from (
  select distinct p.id as student_id
  from public.profiles p
  where p.role = 'student'
) s
cross join public.courses c
left join (
  select
    a.student_id,
    a.course_id,
    sum(a.amount)::integer as amount_paid
  from public.student_course_payment_allocations a
  where a.voided_at is null
  group by a.student_id, a.course_id
) paid on paid.student_id = s.student_id and paid.course_id = c.id
where coalesce(c.active, true) = true
order by s.student_id, c.created_at asc, c.id asc;

grant execute on function public.record_student_course_payment(uuid, integer, jsonb, text, text, text, text, timestamptz)
  to authenticated;
grant execute on function public.apply_student_course_credit(uuid, uuid, integer, timestamptz)
  to authenticated;
grant execute on function public.void_student_course_payment(uuid, text) to authenticated;
grant execute on function public.void_student_course_allocation(uuid, text) to authenticated;
grant execute on function public.student_course_payment_credit(uuid) to authenticated;
