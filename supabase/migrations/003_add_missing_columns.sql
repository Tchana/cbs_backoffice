-- Add columns that may be missing if DB was created from an older schema.
-- Safe to run: IF NOT EXISTS prevents errors when columns already exist.

-- Courses
alter table public.courses
  add column if not exists course_cover_url text;

-- Books
alter table public.books
  add column if not exists book_cover_url text;
alter table public.books
  add column if not exists book_file_url text;
