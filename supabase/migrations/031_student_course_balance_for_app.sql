-- Mobile app home screen: same "amount owed" as Finance → Course payments (total_owed).

create or replace function public.get_my_course_total_owed()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select s.total_owed::integer
      from public.v_student_course_payment_summary s
      where s.student_id = auth.uid()
    ),
    0
  );
$$;

grant execute on function public.get_my_course_total_owed() to authenticated;

comment on function public.get_my_course_total_owed() is
  'Sum of per-course balance_due for the logged-in student (matches backoffice Course payments).';
