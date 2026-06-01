-- =============================================================================
-- Per-course fees in a dedicated table (not on courses.fee_amount)
-- =============================================================================

create table if not exists public.course_fees (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null unique references public.courses(id) on delete cascade,
  amount integer not null check (amount > 0),
  currency text not null default 'XAF',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create index if not exists idx_course_fees_course on public.course_fees(course_id);

alter table public.course_fees enable row level security;

drop policy if exists "course_fees_admin_teacher_all" on public.course_fees;
create policy "course_fees_admin_teacher_all"
  on public.course_fees for all to authenticated
  using (public.current_user_role() in ('admin', 'teacher'))
  with check (public.current_user_role() in ('admin', 'teacher'));

drop trigger if exists trg_course_fees_updated_at on public.course_fees;
create trigger trg_course_fees_updated_at
before update on public.course_fees
for each row execute function public.tg_set_updated_at();

-- Migrate from courses.fee_amount / price_amount when present
insert into public.course_fees (course_id, amount, currency)
select
  c.id,
  greatest(coalesce(c.fee_amount, c.price_amount, 0), 1),
  coalesce(c.currency, 'XAF')
from public.courses c
where coalesce(c.fee_amount, c.price_amount, 0) > 0
on conflict (course_id) do nothing;

alter table public.courses drop constraint if exists courses_fee_amount_non_negative;
alter table public.courses drop column if exists fee_amount;

create or replace function public.upsert_course_fee(
  p_course_id uuid,
  p_amount integer,
  p_currency text default 'XAF',
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if public.current_user_role() not in ('admin', 'teacher') then
    raise exception 'Not authorized';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Fee amount must be > 0';
  end if;

  if not exists (select 1 from public.courses c where c.id = p_course_id) then
    raise exception 'Course not found';
  end if;

  insert into public.course_fees (course_id, amount, currency, notes, created_by)
  values (
    p_course_id,
    p_amount,
    coalesce(nullif(trim(p_currency), ''), 'XAF'),
    p_notes,
    auth.uid()
  )
  on conflict (course_id) do update
  set
    amount = excluded.amount,
    currency = excluded.currency,
    notes = coalesce(excluded.notes, public.course_fees.notes),
    updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.delete_course_fee(p_course_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() not in ('admin', 'teacher') then
    raise exception 'Not authorized';
  end if;

  delete from public.course_fees where course_id = p_course_id;
end;
$$;

create or replace view public.v_course_fees as
select
  c.id as course_id,
  c.title as course_title,
  c.level,
  c.active,
  c.created_at as course_created_at,
  f.id as fee_id,
  f.amount as fee_amount,
  f.currency,
  f.notes,
  f.updated_at as fee_updated_at
from public.courses c
left join public.course_fees f on f.course_id = c.id
order by c.created_at asc, c.id asc;

grant execute on function public.upsert_course_fee(uuid, integer, text, text) to authenticated;
grant execute on function public.delete_course_fee(uuid) to authenticated;
