-- =============================================================================
-- Teacher profile fields (vocation, testimony, journey/parcours)
-- =============================================================================

alter table public.profiles
  add column if not exists vocation text,
  add column if not exists testimony text,
  add column if not exists journey text;

