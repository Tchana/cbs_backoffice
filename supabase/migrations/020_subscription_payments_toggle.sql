-- =============================================================================
-- Global toggle: allow in-app subscription payments vs admin-only grants
-- =============================================================================

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

alter table public.app_settings enable row level security;

drop policy if exists "app_settings_read_authenticated" on public.app_settings;
create policy "app_settings_read_authenticated"
  on public.app_settings for select to authenticated
  using (true);

drop policy if exists "app_settings_admin_write" on public.app_settings;
create policy "app_settings_admin_write"
  on public.app_settings for all to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

insert into public.app_settings (key, value)
values ('subscription_payments_enabled', jsonb_build_object('enabled', false))
on conflict (key) do nothing;

create or replace function public.subscription_payments_enabled()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select (s.value->>'enabled')::boolean
      from public.app_settings s
      where s.key = 'subscription_payments_enabled'
    ),
    false
  );
$$;

create or replace function public.set_subscription_payments_enabled(p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() <> 'admin' then
    raise exception 'Only admins can change subscription payment settings';
  end if;

  insert into public.app_settings (key, value, updated_at, updated_by)
  values (
    'subscription_payments_enabled',
    jsonb_build_object('enabled', coalesce(p_enabled, false)),
    now(),
    auth.uid()
  )
  on conflict (key) do update
  set value = jsonb_build_object('enabled', coalesce(p_enabled, false)),
      updated_at = now(),
      updated_by = auth.uid();
end;
$$;

grant execute on function public.subscription_payments_enabled() to authenticated;
grant execute on function public.set_subscription_payments_enabled(boolean) to authenticated;
