-- =============================================================================
-- Webhook observability + DB-level non-overlapping subscriptions
-- =============================================================================

-- Normalized webhook event log for debugging support tickets.
create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null,
  tx_ref text not null,
  status text not null,
  received_at timestamptz not null default now(),
  signature_valid boolean not null default true,
  raw_payload jsonb,
  error text
);

create unique index if not exists idx_payment_webhook_events_event_id
  on public.payment_webhook_events(event_id);

create index if not exists idx_payment_webhook_events_tx_ref
  on public.payment_webhook_events(tx_ref, received_at desc);

alter table public.payment_webhook_events enable row level security;

drop policy if exists "payment_webhook_events_admin_teacher_read" on public.payment_webhook_events;
create policy "payment_webhook_events_admin_teacher_read"
  on public.payment_webhook_events for select to authenticated
  using (public.current_user_role() in ('admin', 'teacher'));

drop policy if exists "payment_webhook_events_admin_teacher_all" on public.payment_webhook_events;
create policy "payment_webhook_events_admin_teacher_all"
  on public.payment_webhook_events for all to authenticated
  using (public.current_user_role() in ('admin', 'teacher'))
  with check (public.current_user_role() in ('admin', 'teacher'));

-- Enforce non-overlapping active/pending windows per user + plan.
-- This prevents accidental duplicate grants if webhook is replayed differently.
create extension if not exists btree_gist;

alter table public.user_subscriptions
  drop constraint if exists user_subscriptions_no_overlap;

alter table public.user_subscriptions
  add constraint user_subscriptions_no_overlap
  exclude using gist (
    user_id with =,
    plan_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
  where (status in ('pending', 'active'));

-- Single source of truth to extend existing window (renew) or insert a new one.
create or replace function public.extend_or_insert_subscription(
  p_user_id uuid,
  p_plan_id uuid,
  p_payment_tx_id uuid,
  p_source text,
  p_duration_months integer
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_now timestamptz := now();
  v_existing_id uuid;
  v_existing_end timestamptz;
  v_new_end timestamptz;
  v_new_id uuid;
begin
  -- Lock any active window row to avoid race conditions between parallel webhook deliveries.
  select id, ends_at
  into v_existing_id, v_existing_end
  from public.user_subscriptions
  where user_id = p_user_id
    and plan_id = p_plan_id
    and status = 'active'
    and ends_at >= v_now
  order by ends_at desc, created_at desc
  limit 1
  for update;

  if v_existing_id is not null then
    v_new_end := v_existing_end + make_interval(months => greatest(1, p_duration_months));
    update public.user_subscriptions
    set ends_at = v_new_end,
        updated_at = now()
    where id = v_existing_id;
    return v_existing_id;
  end if;

  v_new_end := v_now + make_interval(months => greatest(1, p_duration_months));

  insert into public.user_subscriptions (
    user_id, plan_id, payment_tx_id, source, status, starts_at, ends_at
  )
  values (
    p_user_id, p_plan_id, p_payment_tx_id, p_source, 'active', v_now, v_new_end
  )
  returning id into v_new_id;

  return v_new_id;
end;
$$;

