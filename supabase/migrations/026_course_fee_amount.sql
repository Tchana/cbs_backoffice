-- Superseded by 027_course_fees_table.sql (dedicated course_fees table).
-- Course fee (for manual student course payment tracking; suggested default when admin adds a fee)

alter table public.courses
  add column if not exists fee_amount integer;

update public.courses
set fee_amount = coalesce(fee_amount, price_amount, 0)
where fee_amount is null;

alter table public.courses
  alter column fee_amount set default 0;

alter table public.courses
  alter column fee_amount set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'courses_fee_amount_non_negative'
  ) then
    alter table public.courses
      add constraint courses_fee_amount_non_negative
      check (fee_amount >= 0);
  end if;
end $$;

comment on column public.courses.fee_amount is
  'Default course fee in smallest currency unit (XAF). Admin may override per student when recording obligations.';
