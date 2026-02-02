-- Profiles: extends auth.users with app-specific fields (role, name, avatar)
-- Run this in Supabase SQL Editor after enabling Email auth in Authentication > Providers

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  first_name text,
  last_name text,
  role text not null default 'teacher' check (role in ('teacher', 'student', 'admin')),
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, first_name, last_name, role, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'firstName'),
    coalesce(new.raw_user_meta_data->>'last_name', new.raw_user_meta_data->>'lastName'),
    coalesce(new.raw_user_meta_data->>'role', 'teacher'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Courses
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  level text,
  teacher_id uuid not null references public.profiles(id) on delete restrict,
  course_cover_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Lessons
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  file_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Books
create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text,
  category text,
  book_cover_url text,
  book_file_url text,
  description text,
  language text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Blogs
create table if not exists public.blogs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text,
  content text,
  image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS: enable and allow authenticated users to read/write (adjust policies for production)
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.books enable row level security;
alter table public.blogs enable row level security;

-- Profiles: authenticated users can read/insert/update/delete (dashboard manages users)
create policy "Authenticated can manage profiles"
  on public.profiles for all to authenticated using (true) with check (true);

-- Courses, lessons, books, blogs: full access for authenticated (admin app)
create policy "Authenticated can manage courses"
  on public.courses for all to authenticated using (true) with check (true);
create policy "Authenticated can manage lessons"
  on public.lessons for all to authenticated using (true) with check (true);
create policy "Authenticated can manage books"
  on public.books for all to authenticated using (true) with check (true);
create policy "Authenticated can manage blogs"
  on public.blogs for all to authenticated using (true) with check (true);

-- Storage: create buckets in Dashboard > Storage (or run below).
-- Buckets: avatars, course-covers, lesson-files, book-covers, book-files, blog-images
-- For each bucket: Public = true if you want public read URLs; add policy "Authenticated users can upload"
--   (Storage > bucket > Policies > New policy > "Allow authenticated uploads").

-- Optional: make first user an admin (run after first signup, replace USER_UUID):
-- update public.profiles set role = 'admin' where id = 'USER_UUID';
