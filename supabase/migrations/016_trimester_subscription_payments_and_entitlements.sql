-- =============================================================================
-- Trimester subscriptions + payment transactions + entitlement projection
-- =============================================================================

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  target_role text not null check (target_role in ('student', 'library_user')),
  duration_months integer not null default 3 check (duration_months > 0),
  price_amount integer not null check (price_amount > 0),
  currency text not null default 'XAF',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id) on delete restrict,
  amount integer not null check (amount > 0),
  currency text not null default 'XAF',
  provider text not null default 'mobile_money',
  provider_tx_ref text not null unique,
  provider_status text not null default 'pending' check (
    provider_status in ('pending', 'succeeded', 'failed', 'cancelled')
  ),
  provider_event_id text,
  checkout_payload jsonb,
  raw_webhook_payload jsonb,
  error_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  processed_at timestamptz
);

create unique index if not exists idx_payment_transactions_provider_event
  on public.payment_transactions(provider_event_id)
  where provider_event_id is not null;

create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id) on delete restrict,
  payment_tx_id uuid references public.payment_transactions(id) on delete set null,
  source text not null default 'mobile_app' check (source in ('mobile_app', 'backoffice_manual', 'system')),
  status text not null default 'active' check (status in ('pending', 'active', 'expired', 'cancelled')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  check (ends_at > starts_at)
);

create index if not exists idx_user_subscriptions_user_status_dates
  on public.user_subscriptions(user_id, status, starts_at, ends_at);

-- Prevent duplicate active windows for same user + plan period start.
create unique index if not exists idx_user_subscriptions_unique_window
  on public.user_subscriptions(user_id, plan_id, starts_at)
  where status in ('pending', 'active');

alter table public.subscription_plans enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.user_subscriptions enable row level security;

drop policy if exists "subscription_plans_read_authenticated" on public.subscription_plans;
create policy "subscription_plans_read_authenticated"
  on public.subscription_plans for select to authenticated
  using (active = true);

drop policy if exists "subscription_plans_admin_teacher_manage" on public.subscription_plans;
create policy "subscription_plans_admin_teacher_manage"
  on public.subscription_plans for all to authenticated
  using (public.current_user_role() in ('admin', 'teacher'))
  with check (public.current_user_role() in ('admin', 'teacher'));

drop policy if exists "payment_transactions_read_own" on public.payment_transactions;
create policy "payment_transactions_read_own"
  on public.payment_transactions for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "payment_transactions_admin_teacher_all" on public.payment_transactions;
create policy "payment_transactions_admin_teacher_all"
  on public.payment_transactions for all to authenticated
  using (public.current_user_role() in ('admin', 'teacher'))
  with check (public.current_user_role() in ('admin', 'teacher'));

drop policy if exists "user_subscriptions_read_own" on public.user_subscriptions;
create policy "user_subscriptions_read_own"
  on public.user_subscriptions for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "user_subscriptions_admin_teacher_all" on public.user_subscriptions;
create policy "user_subscriptions_admin_teacher_all"
  on public.user_subscriptions for all to authenticated
  using (public.current_user_role() in ('admin', 'teacher'))
  with check (public.current_user_role() in ('admin', 'teacher'));

create or replace function public.apply_subscription_entitlement(p_user_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_now timestamptz := now();
  v_role text;
  v_subscription text;
  v_max_level integer;
begin
  -- Auto-expire windows in the past.
  update public.user_subscriptions
  set status = 'expired',
      updated_at = now()
  where user_id = p_user_id
    and status = 'active'
    and ends_at < v_now;

  select sp.target_role
  into v_role
  from public.user_subscriptions us
  join public.subscription_plans sp on sp.id = us.plan_id
  where us.user_id = p_user_id
    and us.status = 'active'
    and us.starts_at <= v_now
    and us.ends_at >= v_now
  order by us.ends_at desc, us.created_at desc
  limit 1;

  if v_role = 'student' then
    v_subscription := 'student';
    v_max_level := 1;
  elsif v_role = 'library_user' then
    v_subscription := 'library_user';
    v_max_level := 0;
  else
    v_role := null;
    v_subscription := 'none';
    v_max_level := 0;
  end if;

  update public.profiles
  set role = coalesce(v_role, case when role in ('admin', 'teacher') then role else 'teacher' end),
      subscription_type = v_subscription,
      school_max_level = v_max_level,
      updated_at = now()
  where id = p_user_id;
end;
$$;

create or replace function public.tg_user_subscriptions_apply_entitlement()
returns trigger
language plpgsql
security definer
as $$
begin
  perform public.apply_subscription_entitlement(coalesce(new.user_id, old.user_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_user_subscriptions_apply_entitlement on public.user_subscriptions;
create trigger trg_user_subscriptions_apply_entitlement
after insert or update or delete on public.user_subscriptions
for each row execute function public.tg_user_subscriptions_apply_entitlement();

create or replace function public.tg_payment_transactions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_payment_transactions_updated_at on public.payment_transactions;
create trigger trg_payment_transactions_updated_at
before update on public.payment_transactions
for each row execute function public.tg_payment_transactions_updated_at();

drop trigger if exists trg_subscription_plans_updated_at on public.subscription_plans;
create trigger trg_subscription_plans_updated_at
before update on public.subscription_plans
for each row execute function public.tg_set_updated_at();

drop trigger if exists trg_user_subscriptions_updated_at on public.user_subscriptions;
create trigger trg_user_subscriptions_updated_at
before update on public.user_subscriptions
for each row execute function public.tg_set_updated_at();

insert into public.subscription_plans (code, name, target_role, duration_months, price_amount, currency, active)
values
  ('student_trimester', 'Student Trimester', 'student', 3, 30000, 'XAF', true),
  ('library_trimester', 'Library Trimester', 'library_user', 3, 15000, 'XAF', true)
on conflict (code) do update
set name = excluded.name,
    target_role = excluded.target_role,
    duration_months = excluded.duration_months,
    price_amount = excluded.price_amount,
    currency = excluded.currency,
    active = excluded.active,
    updated_at = now();

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
  us.starts_at,
  us.ends_at,
  greatest(0, floor(extract(epoch from (us.ends_at - now())) / 86400))::integer as days_remaining,
  sp.code as plan_code,
  sp.name as plan_name,
  sp.target_role as plan_target_role,
  pt.provider_tx_ref as payment_reference,
  pt.provider_status as payment_status
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
where p.role in ('student', 'library_user', 'teacher', 'admin');
