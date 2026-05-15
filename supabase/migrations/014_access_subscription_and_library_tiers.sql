-- =============================================================================
-- Access model: library tiers + subscriptions + level-based school access
-- =============================================================================

alter table public.profiles
  add column if not exists subscription_type text not null default 'none',
  add column if not exists school_max_level integer not null default 0;

do $$
declare
  v_role_constraint text;
begin
  -- Replace old role check to include library_user.
  select conname
  into v_role_constraint
  from pg_constraint
  where conrelid = 'public.profiles'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%role%'
  limit 1;

  if v_role_constraint is not null then
    execute format('alter table public.profiles drop constraint %I', v_role_constraint);
  end if;

  alter table public.profiles
    add constraint profiles_role_check
    check (role in ('teacher', 'student', 'admin', 'library_user'));
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_subscription_type_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_subscription_type_check
      check (subscription_type in ('none', 'library_user', 'student'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_school_max_level_non_negative'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_school_max_level_non_negative
      check (school_max_level >= 0);
  end if;
end $$;

alter table public.books
  add column if not exists access_tier text not null default 'public';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'books_access_tier_check'
      and conrelid = 'public.books'::regclass
  ) then
    alter table public.books
      add constraint books_access_tier_check
      check (access_tier in ('public', 'subscriber'));
  end if;
end $$;

