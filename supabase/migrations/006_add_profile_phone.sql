-- Add phone number support to user profiles.
alter table public.profiles
  add column if not exists phone text;
