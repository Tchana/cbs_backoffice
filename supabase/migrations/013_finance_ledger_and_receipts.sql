-- =============================================================================
-- Finance ledger + FIFO allocations + receipt metadata
-- =============================================================================

alter table public.courses
  add column if not exists price_amount integer not null default 0,
  add column if not exists currency text not null default 'XAF';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'courses_price_amount_non_negative'
  ) then
    alter table public.courses
      add constraint courses_price_amount_non_negative
      check (price_amount >= 0);
  end if;
end $$;

create table if not exists public.student_fee_charges (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  enrollment_id uuid references public.enrollments(id) on delete set null,
  amount integer not null,
  currency text not null default 'XAF',
  charge_type text not null check (
    charge_type in ('course_fee', 'manual_debt', 'penalty', 'discount', 'credit_adjustment')
  ),
  description text,
  operation_date timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.student_fee_payments (
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
  created_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.student_fee_allocations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.student_fee_payments(id) on delete cascade,
  charge_id uuid not null references public.student_fee_charges(id) on delete cascade,
  amount_allocated integer not null check (amount_allocated > 0),
  operation_date timestamptz not null default now(),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  unique (payment_id, charge_id)
);

create table if not exists public.student_fee_receipts (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null unique references public.student_fee_payments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  receipt_number text not null unique,
  file_url text,
  file_path text,
  generated_at timestamptz,
  operation_date timestamptz not null default now(),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create index if not exists idx_student_fee_charges_student on public.student_fee_charges(student_id, operation_date, created_at);
create index if not exists idx_student_fee_payments_student on public.student_fee_payments(student_id, operation_date, paid_at);
create index if not exists idx_student_fee_allocations_payment on public.student_fee_allocations(payment_id);
create index if not exists idx_student_fee_allocations_charge on public.student_fee_allocations(charge_id);
create index if not exists idx_student_fee_receipts_student on public.student_fee_receipts(student_id, generated_at);

alter table public.student_fee_charges enable row level security;
alter table public.student_fee_payments enable row level security;
alter table public.student_fee_allocations enable row level security;
alter table public.student_fee_receipts enable row level security;

create policy "finance_charges_admin_teacher_all"
  on public.student_fee_charges for all to authenticated
  using (public.current_user_role() in ('admin', 'teacher'))
  with check (public.current_user_role() in ('admin', 'teacher'));

create policy "finance_payments_admin_teacher_all"
  on public.student_fee_payments for all to authenticated
  using (public.current_user_role() in ('admin', 'teacher'))
  with check (public.current_user_role() in ('admin', 'teacher'));

create policy "finance_allocations_admin_teacher_all"
  on public.student_fee_allocations for all to authenticated
  using (public.current_user_role() in ('admin', 'teacher'))
  with check (public.current_user_role() in ('admin', 'teacher'));

create policy "finance_receipts_admin_teacher_all"
  on public.student_fee_receipts for all to authenticated
  using (public.current_user_role() in ('admin', 'teacher'))
  with check (public.current_user_role() in ('admin', 'teacher'));

create policy "finance_students_read_own_payments"
  on public.student_fee_payments for select to authenticated
  using (student_id = auth.uid());

create policy "finance_students_read_own_receipts"
  on public.student_fee_receipts for select to authenticated
  using (student_id = auth.uid());

create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_student_fee_charges_updated_at on public.student_fee_charges;
create trigger trg_student_fee_charges_updated_at
before update on public.student_fee_charges
for each row execute function public.tg_set_updated_at();

create or replace function public.tg_create_course_fee_charge_on_enroll()
returns trigger
language plpgsql
security definer
as $$
declare
  v_price integer;
  v_currency text;
begin
  select c.price_amount, c.currency
  into v_price, v_currency
  from public.courses c
  where c.id = new.course_id;

  if coalesce(v_price, 0) > 0 then
    insert into public.student_fee_charges (
      student_id, course_id, enrollment_id, amount, currency, charge_type,
      description, operation_date, created_by
    )
    values (
      new.student_id, new.course_id, new.id, v_price, coalesce(v_currency, 'XAF'),
      'course_fee', 'Auto charge from enrollment', coalesce(new.created_at, now()), auth.uid()
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_create_course_fee_charge_on_enroll on public.enrollments;
create trigger trg_create_course_fee_charge_on_enroll
after insert on public.enrollments
for each row execute function public.tg_create_course_fee_charge_on_enroll();

create or replace function public.record_payment_and_allocate_fifo(
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
as $$
declare
  v_payment_id uuid;
  v_remaining integer;
  v_charge record;
  v_charge_outstanding integer;
begin
  if p_amount <= 0 then
    raise exception 'Payment amount must be > 0';
  end if;

  insert into public.student_fee_payments (
    student_id, amount, currency, payment_method, reference, notes,
    operation_date, paid_at, created_by
  )
  values (
    p_student_id, p_amount, p_currency, p_payment_method, p_reference, p_notes,
    p_operation_date, now(), auth.uid()
  )
  returning id into v_payment_id;

  v_remaining := p_amount;

  for v_charge in
    select c.id
    from public.student_fee_charges c
    where c.student_id = p_student_id
    order by c.operation_date asc, c.created_at asc, c.id asc
  loop
    exit when v_remaining <= 0;

    select c.amount - coalesce(sum(a.amount_allocated), 0)
    into v_charge_outstanding
    from public.student_fee_charges c
    left join public.student_fee_allocations a on a.charge_id = c.id
    where c.id = v_charge.id
    group by c.id, c.amount;

    if coalesce(v_charge_outstanding, 0) <= 0 then
      continue;
    end if;

    insert into public.student_fee_allocations (
      payment_id, charge_id, amount_allocated, operation_date, created_by
    )
    values (
      v_payment_id,
      v_charge.id,
      least(v_remaining, v_charge_outstanding),
      p_operation_date,
      auth.uid()
    );

    v_remaining := v_remaining - least(v_remaining, v_charge_outstanding);
  end loop;

  return v_payment_id;
end;
$$;

create or replace view public.v_student_finance_summary as
select
  p.id as student_id,
  p.first_name,
  p.last_name,
  p.email,
  coalesce(ch.total_charges, 0) as total_charges,
  coalesce(pm.total_payments, 0) as total_payments,
  coalesce(ch.total_charges, 0) - coalesce(pm.total_payments, 0) as balance_due,
  pm.last_payment_at
from public.profiles p
left join (
  select student_id, sum(amount)::integer as total_charges
  from public.student_fee_charges
  group by student_id
) ch on ch.student_id = p.id
left join (
  select student_id, sum(amount)::integer as total_payments, max(operation_date) as last_payment_at
  from public.student_fee_payments
  group by student_id
) pm on pm.student_id = p.id
where p.role = 'student';

