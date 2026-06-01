-- Use course_fees catalog for outstanding balance and payment validation

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
    coalesce(
      (
        select f.amount
        from public.course_fees f
        where f.course_id = p_course_id
      ),
      (
        select c.price_amount
        from public.courses c
        where c.id = p_course_id
      ),
      0
    )
    - public.student_course_paid_amount(p_student_id, p_course_id),
    0
  );
$$;

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
begin
  if public.current_user_role() not in ('admin', 'teacher') then
    raise exception 'Not authorized';
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

    if not exists (select 1 from public.courses c where c.id = v_course_id) then
      raise exception 'Course not found: %', v_course_id;
    end if;

    if not exists (select 1 from public.course_fees f where f.course_id = v_course_id) then
      raise exception 'No catalog fee set for course %. Add it under Course fees.', v_course_id;
    end if;

    v_outstanding := public.student_course_outstanding(p_student_id, v_course_id);
    if v_alloc_amount > v_outstanding then
      raise exception 'Allocation % XAF exceeds outstanding % XAF for course',
        v_alloc_amount, v_outstanding;
    end if;

    v_alloc_total := v_alloc_total + v_alloc_amount;
  end loop;

  if v_alloc_total <= 0 then
    raise exception 'Select at least one course to pay for';
  end if;

  if p_amount is null or p_amount <= 0 then
    p_amount := v_alloc_total;
  elsif p_amount <> v_alloc_total then
    raise exception 'Deposit amount % XAF must equal the sum of course fees % XAF',
      p_amount, v_alloc_total;
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

create or replace view public.v_student_course_balances as
select
  s.student_id,
  c.id as course_id,
  c.title as course_title,
  c.created_at as course_created_at,
  coalesce(f.amount, c.price_amount, 0)::integer as course_price,
  coalesce(f.currency, c.currency, 'XAF') as currency,
  coalesce(paid.amount_paid, 0)::integer as amount_paid,
  greatest(
    coalesce(f.amount, c.price_amount, 0) - coalesce(paid.amount_paid, 0),
    0
  )::integer as balance_due
from (
  select distinct p.id as student_id
  from public.profiles p
  where p.role = 'student'
) s
cross join public.courses c
left join public.course_fees f on f.course_id = c.id
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
