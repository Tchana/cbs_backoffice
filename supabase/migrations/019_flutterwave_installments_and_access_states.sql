-- =============================================================================
-- Flutterwave installments + manual access states
-- =============================================================================

alter table public.user_subscriptions
  add column if not exists access_state text not null default 'full'
    check (access_state in ('full', 'downgraded', 'suspended')),
  add column if not exists access_state_note text,
  add column if not exists access_state_updated_at timestamptz,
  add column if not exists access_state_updated_by uuid references public.profiles(id) on delete set null;

create table if not exists public.subscription_plan_installments (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.subscription_plans(id) on delete cascade,
  installment_number integer not null check (installment_number > 0),
  label text,
  amount integer not null check (amount > 0),
  due_after_days integer not null default 0 check (due_after_days >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, installment_number)
);

create table if not exists public.user_subscription_installments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.user_subscriptions(id) on delete cascade,
  installment_number integer not null check (installment_number > 0),
  label text,
  amount_due integer not null check (amount_due > 0),
  amount_paid integer not null default 0 check (amount_paid >= 0),
  currency text not null default 'XAF',
  due_at timestamptz not null,
  paid_at timestamptz,
  status text not null default 'pending'
    check (status in ('pending', 'partial', 'paid', 'waived', 'overdue')),
  payment_tx_id uuid references public.payment_transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subscription_id, installment_number)
);

alter table public.subscription_plan_installments enable row level security;
alter table public.user_subscription_installments enable row level security;

drop policy if exists "subscription_plan_installments_read_authenticated"
  on public.subscription_plan_installments;
create policy "subscription_plan_installments_read_authenticated"
  on public.subscription_plan_installments for select to authenticated
  using (active = true or public.current_user_role() in ('admin', 'teacher'));

drop policy if exists "subscription_plan_installments_admin_all"
  on public.subscription_plan_installments;
create policy "subscription_plan_installments_admin_all"
  on public.subscription_plan_installments for all to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

drop policy if exists "user_subscription_installments_read_own"
  on public.user_subscription_installments;
create policy "user_subscription_installments_read_own"
  on public.user_subscription_installments for select to authenticated
  using (
    exists (
      select 1
      from public.user_subscriptions us
      where us.id = subscription_id
        and us.user_id = auth.uid()
    )
  );

drop policy if exists "user_subscription_installments_admin_teacher_all"
  on public.user_subscription_installments;
create policy "user_subscription_installments_admin_teacher_all"
  on public.user_subscription_installments for all to authenticated
  using (public.current_user_role() in ('admin', 'teacher'))
  with check (public.current_user_role() in ('admin', 'teacher'));

drop trigger if exists trg_subscription_plan_installments_updated_at
  on public.subscription_plan_installments;
create trigger trg_subscription_plan_installments_updated_at
before update on public.subscription_plan_installments
for each row execute function public.tg_set_updated_at();

drop trigger if exists trg_user_subscription_installments_updated_at
  on public.user_subscription_installments;
create trigger trg_user_subscription_installments_updated_at
before update on public.user_subscription_installments
for each row execute function public.tg_set_updated_at();

-- Preserve current behavior until admins customize schedules: one installment
-- matching the full plan price.
insert into public.subscription_plan_installments (
  plan_id, installment_number, label, amount, due_after_days, active
)
select id, 1, 'Full payment', price_amount, 0, true
from public.subscription_plans
on conflict (plan_id, installment_number) do nothing;

create or replace function public.ensure_subscription_installments(
  p_subscription_id uuid
)
returns void
language plpgsql
security definer
as $$
declare
  v_sub public.user_subscriptions%rowtype;
  v_plan public.subscription_plans%rowtype;
begin
  select * into v_sub
  from public.user_subscriptions
  where id = p_subscription_id;

  if v_sub.id is null then
    raise exception 'Subscription not found';
  end if;

  select * into v_plan
  from public.subscription_plans
  where id = v_sub.plan_id;

  insert into public.user_subscription_installments (
    subscription_id,
    installment_number,
    label,
    amount_due,
    currency,
    due_at,
    status
  )
  select
    v_sub.id,
    spi.installment_number,
    coalesce(spi.label, 'Installment ' || spi.installment_number),
    spi.amount,
    v_plan.currency,
    v_sub.starts_at + make_interval(days => spi.due_after_days),
    'pending'
  from public.subscription_plan_installments spi
  where spi.plan_id = v_sub.plan_id
    and spi.active = true
  on conflict (subscription_id, installment_number) do nothing;
end;
$$;

create or replace function public.record_subscription_installment_payment(
  p_user_id uuid,
  p_plan_id uuid,
  p_payment_tx_id uuid,
  p_amount integer,
  p_currency text,
  p_installment_id uuid default null,
  p_installment_number integer default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_now timestamptz := now();
  v_subscription_id uuid;
  v_installment_id uuid;
  v_paid integer;
  v_due integer;
begin
  select id
  into v_subscription_id
  from public.user_subscriptions
  where user_id = p_user_id
    and plan_id = p_plan_id
    and status = 'active'
    and starts_at <= v_now
    and ends_at >= v_now
  order by created_at desc
  limit 1
  for update;

  if v_subscription_id is null then
    v_subscription_id := public.extend_or_insert_subscription(
      p_user_id,
      p_plan_id,
      p_payment_tx_id,
      'mobile_app',
      (
        select coalesce(duration_months, 3)
        from public.subscription_plans
        where id = p_plan_id
      )
    );

    update public.user_subscriptions
    set access_state = 'full',
        access_state_updated_at = now()
    where id = v_subscription_id;
  end if;

  perform public.ensure_subscription_installments(v_subscription_id);

  if p_installment_id is not null then
    select id into v_installment_id
    from public.user_subscription_installments
    where id = p_installment_id
      and subscription_id = v_subscription_id
    for update;
  end if;

  if v_installment_id is null and p_installment_number is not null then
    select id into v_installment_id
    from public.user_subscription_installments
    where subscription_id = v_subscription_id
      and installment_number = p_installment_number
    for update;
  end if;

  if v_installment_id is null then
    select id into v_installment_id
    from public.user_subscription_installments
    where subscription_id = v_subscription_id
      and status not in ('paid', 'waived')
    order by installment_number
    limit 1
    for update;
  end if;

  if v_installment_id is null then
    return v_subscription_id;
  end if;

  update public.user_subscription_installments
  set amount_paid = least(amount_due, amount_paid + greatest(0, p_amount)),
      payment_tx_id = p_payment_tx_id,
      paid_at = case
        when amount_paid + greatest(0, p_amount) >= amount_due then now()
        else paid_at
      end,
      status = case
        when amount_paid + greatest(0, p_amount) >= amount_due then 'paid'
        when amount_paid + greatest(0, p_amount) > 0 then 'partial'
        else status
      end,
      updated_at = now()
  where id = v_installment_id
  returning amount_paid, amount_due into v_paid, v_due;

  perform public.apply_subscription_entitlement(p_user_id);
  return v_subscription_id;
end;
$$;

create or replace function public.set_subscription_access_state(
  p_subscription_id uuid,
  p_access_state text,
  p_note text default null
)
returns void
language plpgsql
security definer
as $$
declare
  v_actor uuid := auth.uid();
begin
  if public.current_user_role() <> 'admin' then
    raise exception 'Only admins can change subscription access state';
  end if;

  if p_access_state not in ('full', 'downgraded', 'suspended') then
    raise exception 'Invalid access state';
  end if;

  update public.user_subscriptions
  set access_state = p_access_state,
      access_state_note = p_note,
      access_state_updated_at = now(),
      access_state_updated_by = v_actor,
      updated_at = now()
  where id = p_subscription_id;
end;
$$;

create or replace function public.current_user_subscription_access_state()
returns text as $$
  select coalesce((
    select us.access_state
    from public.user_subscriptions us
    where us.user_id = auth.uid()
      and us.status = 'active'
      and us.starts_at <= now()
      and us.ends_at >= now()
    order by us.created_at desc
    limit 1
  ), 'none');
$$ language sql security definer stable;

create or replace function public.current_user_has_library_access()
returns boolean as $$
  select public.current_user_subscription_type() in ('student','library_user')
    and public.current_user_subscription_access_state() <> 'suspended';
$$ language sql security definer stable;

create or replace function public.current_user_has_course_access()
returns boolean as $$
  select public.current_user_subscription_type() = 'student'
    and public.current_user_subscription_access_state() <> 'suspended';
$$ language sql security definer stable;

create or replace view public.v_subscription_receivables as
select
  us.id as subscription_id,
  us.user_id,
  p.email,
  p.first_name,
  p.last_name,
  p.role,
  p.subscription_type,
  us.status as subscription_status,
  us.access_state,
  us.starts_at,
  us.ends_at,
  sp.id as plan_id,
  sp.code as plan_code,
  sp.name as plan_name,
  sp.target_role,
  sp.currency,
  coalesce(sum(usi.amount_due), 0)::integer as total_due,
  coalesce(sum(usi.amount_paid), 0)::integer as total_paid,
  coalesce(sum(greatest(usi.amount_due - usi.amount_paid, 0)), 0)::integer as amount_owing,
  coalesce(sum(
    case
      when usi.status not in ('paid', 'waived') and usi.due_at < now()
      then greatest(usi.amount_due - usi.amount_paid, 0)
      else 0
    end
  ), 0)::integer as overdue_amount,
  count(*) filter (
    where usi.status not in ('paid', 'waived') and usi.due_at < now()
  )::integer as overdue_installments,
  min(usi.due_at) filter (where usi.status not in ('paid', 'waived')) as next_due_at
from public.user_subscriptions us
join public.profiles p on p.id = us.user_id
join public.subscription_plans sp on sp.id = us.plan_id
left join public.user_subscription_installments usi on usi.subscription_id = us.id
group by us.id, p.id, sp.id;

-- The existing view has a different column order. PostgreSQL cannot insert new
-- columns into the middle of a view with CREATE OR REPLACE, so recreate it.
drop view if exists public.v_user_subscription_status;

create or replace view public.v_user_subscription_status as
select
  p.id as user_id,
  p.email,
  p.first_name,
  p.last_name,
  p.role,
  p.subscription_type,
  p.school_max_level,
  us.id as subscription_id,
  us.status as subscription_status,
  coalesce(us.access_state, 'none') as access_state,
  (coalesce(us.access_state, 'none') = 'full') as can_submit_assignments,
  (coalesce(us.access_state, 'none') = 'suspended') as is_suspended,
  us.starts_at,
  us.ends_at,
  greatest(0, floor(extract(epoch from (us.ends_at - now())) / 86400))::integer as days_remaining,
  sp.code as plan_code,
  sp.name as plan_name,
  sp.target_role as plan_target_role,
  pt.provider_tx_ref as payment_reference,
  pt.provider_status as payment_status,
  coalesce(vr.total_due, 0)::integer as total_due,
  coalesce(vr.total_paid, 0)::integer as total_paid,
  coalesce(vr.amount_owing, 0)::integer as amount_owing,
  coalesce(vr.overdue_amount, 0)::integer as overdue_amount,
  coalesce(vr.overdue_installments, 0)::integer as overdue_installments,
  vr.next_due_at
from public.profiles p
left join lateral (
  select us1.*
  from public.user_subscriptions us1
  where us1.user_id = p.id
  order by us1.created_at desc
  limit 1
) us on true
left join public.subscription_plans sp on sp.id = us.plan_id
left join public.payment_transactions pt on pt.id = us.payment_tx_id
left join public.v_subscription_receivables vr on vr.subscription_id = us.id
where p.role in ('student', 'library_user', 'teacher', 'admin');
