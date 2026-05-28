-- =============================================================================
-- Keep profiles.role + subscription_type aligned with the winning active subscription
-- =============================================================================

create or replace function public.apply_subscription_entitlement(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_target_role text;
  v_subscription text;
  v_max_level integer;
  v_existing_role text;
begin
  -- Auto-expire windows in the past.
  update public.user_subscriptions
  set status = 'expired',
      updated_at = now()
  where user_id = p_user_id
    and status = 'active'
    and ends_at < v_now;

  select sp.target_role
  into v_target_role
  from public.user_subscriptions us
  join public.subscription_plans sp on sp.id = us.plan_id
  where us.user_id = p_user_id
    and us.status = 'active'
    and us.starts_at <= v_now
    and us.ends_at >= v_now
  order by
    case sp.target_role when 'student' then 0 when 'library_user' then 1 else 2 end,
    us.ends_at desc,
    us.created_at desc
  limit 1;

  select role into v_existing_role from public.profiles where id = p_user_id;

  if v_target_role = 'student' then
    v_subscription := 'student';
    v_max_level := 1;
  elsif v_target_role = 'library_user' then
    v_subscription := 'library_user';
    v_max_level := 0;
  else
    v_target_role := null;
    v_subscription := 'none';
    v_max_level := 0;
  end if;

  update public.profiles
  set
    role = case
      when v_target_role is not null then v_target_role
      when role in ('admin', 'teacher') then role
      when role in ('student', 'library_user') then role
      else coalesce(v_existing_role, 'student')
    end,
    subscription_type = v_subscription,
    school_max_level = v_max_level,
    updated_at = now()
  where id = p_user_id;
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
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_user_id uuid;
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
  where id = p_subscription_id
  returning user_id into v_user_id;

  if v_user_id is not null then
    perform public.apply_subscription_entitlement(v_user_id);
  end if;
end;
$$;

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
  join public.subscription_plans sp1 on sp1.id = us1.plan_id
  where us1.user_id = p.id
    and us1.status = 'active'
    and us1.starts_at <= now()
    and us1.ends_at >= now()
  order by
    case sp1.target_role when 'student' then 0 when 'library_user' then 1 else 2 end,
    us1.ends_at desc,
    us1.created_at desc
  limit 1
) us on true
left join public.subscription_plans sp on sp.id = us.plan_id
left join public.payment_transactions pt on pt.id = us.payment_tx_id
left join public.v_subscription_receivables vr on vr.subscription_id = us.id
where p.role in ('student', 'library_user', 'teacher', 'admin');
