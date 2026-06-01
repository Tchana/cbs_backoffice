-- Deposits: any amount; auto-allocate to courses in creation order (waterfall). Remainder = credit.

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
  v_remaining integer;
  v_course record;
  v_outstanding integer;
  v_apply integer;
  v_manual_total integer := 0;
  v_row jsonb;
  v_course_id uuid;
  v_alloc_amount integer;
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
    operation_date, paid_at, created_by
  )
  values (
    p_student_id, p_amount, coalesce(nullif(trim(p_currency), ''), 'XAF'),
    coalesce(nullif(trim(p_payment_method), ''), 'cash'),
    p_reference, p_notes, p_operation_date, now(), auth.uid()
  )
  returning id into v_payment_id;

  -- Optional manual lines (non-empty JSON array); otherwise waterfall by course created_at
  if coalesce(jsonb_array_length(p_allocations), 0) > 0 then
    for v_row in select * from jsonb_array_elements(p_allocations)
    loop
      v_course_id := nullif(trim(v_row->>'course_id'), '')::uuid;
      v_alloc_amount := (v_row->>'amount')::integer;

      if v_course_id is null or v_alloc_amount is null or v_alloc_amount <= 0 then
        raise exception 'Each allocation needs course_id and a positive amount';
      end if;

      v_outstanding := public.student_course_outstanding(p_student_id, v_course_id);
      if v_alloc_amount > v_outstanding then
        raise exception 'Allocation % XAF exceeds outstanding % XAF for course',
          v_alloc_amount, v_outstanding;
      end if;

      v_manual_total := v_manual_total + v_alloc_amount;

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

    if v_manual_total > p_amount then
      raise exception 'Total allocated % XAF exceeds deposit % XAF', v_manual_total, p_amount;
    end if;
  else
    v_remaining := p_amount;

    for v_course in
      select c.id as course_id
      from public.courses c
      inner join public.course_fees f on f.course_id = c.id
      where coalesce(c.active, true) = true
      order by c.created_at asc, c.id asc
    loop
      exit when v_remaining <= 0;

      v_outstanding := public.student_course_outstanding(p_student_id, v_course.course_id);
      if v_outstanding <= 0 then
        continue;
      end if;

      v_apply := least(v_remaining, v_outstanding);

      insert into public.student_course_payment_allocations (
        student_id, payment_id, course_id, amount, currency, source,
        operation_date, created_by
      )
      values (
        p_student_id, v_payment_id, v_course.course_id, v_apply,
        coalesce(nullif(trim(p_currency), ''), 'XAF'),
        'payment', p_operation_date, auth.uid()
      );

      v_remaining := v_remaining - v_apply;
    end loop;
  end if;

  return v_payment_id;
end;
$$;
