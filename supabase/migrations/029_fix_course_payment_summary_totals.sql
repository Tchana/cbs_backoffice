-- Only courses with a catalog fee count; totals = sum of per-course balances.

create or replace view public.v_student_course_balances as
select
  s.student_id,
  c.id as course_id,
  c.title as course_title,
  c.created_at as course_created_at,
  f.amount::integer as course_price,
  f.currency,
  coalesce(paid.amount_paid, 0)::integer as amount_paid,
  greatest(f.amount - coalesce(paid.amount_paid, 0), 0)::integer as balance_due
from (
  select distinct p.id as student_id
  from public.profiles p
  where p.role = 'student'
) s
cross join public.courses c
inner join public.course_fees f on f.course_id = c.id
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
      (select f.amount from public.course_fees f where f.course_id = p_course_id),
      0
    )
    - public.student_course_paid_amount(p_student_id, p_course_id),
    0
  );
$$;

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
  coalesce(pay_totals.total_deposits, 0) - coalesce(alloc_totals.total_allocated, 0) as credit_balance,
  pay_totals.last_payment_at
from public.profiles p
left join (
  select
    b.student_id,
    sum(b.course_price)::integer as total_course_price,
    sum(b.amount_paid)::integer as total_allocated,
    sum(b.balance_due)::integer as total_owed
  from public.v_student_course_balances b
  group by b.student_id
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
left join (
  select
    a.student_id,
    sum(a.amount)::integer as total_allocated
  from public.student_course_payment_allocations a
  where a.voided_at is null
  group by a.student_id
) alloc_totals on alloc_totals.student_id = p.id
where p.role = 'student';
