# Supabase setup for this app

Accounts are **only created by admins** from inside the app (after login). When an admin creates a user, the app calls a Supabase Edge Function that creates the auth user; the database trigger then creates the profile row automatically.

Follow these steps to get your first admin and run the app.

---

## 1. Create a Supabase project

- Go to [supabase.com](https://supabase.com) and create a project.
- In the dashboard, open **Settings → API** and copy:
  - **Project URL**
  - **anon public** key (not the service_role key).

---

## 2. Environment variables

- In the project root, copy `.env.example` to `.env`.
- Set in `.env`:
  - `VITE_SUPABASE_URL` = your Project URL
  - `VITE_SUPABASE_ANON_KEY` = your anon public key

Restart the dev server after changing `.env` (`npm run dev`).

---

## 3. Run the database schema

- In Supabase, open **SQL Editor**.
- Copy the full contents of `supabase/migrations/001_initial_schema.sql`.
- Paste into the editor and run it.

This creates the `profiles`, `courses`, `lessons`, `books`, `blogs` tables and the **trigger** that creates a profile row whenever an auth user is created.

---

## 4. Deploy the Edge Function (create-user)

Admins create users via the **create-user** Edge Function. Deploy it with the Supabase CLI:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy create-user
```

(`YOUR_PROJECT_REF` is in your project URL: `https://YOUR_PROJECT_REF.supabase.co`.)

If you don’t use the CLI, you can create the function in the dashboard: **Edge Functions → New function → create-user**, and paste the code from `supabase/functions/create-user/index.ts`. The function needs the **service_role** key (it’s available as a secret in the Edge Function environment).

---

## 5. Create storage buckets

- In Supabase, go to **Storage**.
- Create these buckets (you can make them **Public** if you want public read URLs):
  - `avatars` – profile pictures
  - `course-covers`, `lesson-files`, `book-covers`, `book-files`, `blog-images`
- For each bucket, add a policy so **authenticated** users can upload (and read if needed).

---

## 6. Create your first admin user

There is **no public signup**. Create the first user in Supabase, then mark them as admin:

1. In Supabase: **Authentication → Users → Add user**.
2. Enter email and password, then create the user.
3. Open **Table Editor → profiles**.
4. Find the new user (same `id` as in Authentication) and set **role** to `admin`.  
   If the row doesn’t exist yet, run the migration again or insert a row:  
   `insert into public.profiles (id, email, role) values ('USER_UUID', 'their@email.com', 'admin');`

---

## 7. Log in and create other users

1. Run the app: `npm run dev`.
2. Open the app and **log in** with the admin email and password.
3. From the dashboard (Users, Students, or Teachers), use **Register / Add** to create new users.  
   Each created user gets an auth account and a profile row (via the trigger).

---

## Summary

- **Login page:** Only login; no signup. Message: “Accounts are created by admins from the dashboard after login.”
- **Creating users:** Only when logged in as admin; the app calls the **create-user** Edge Function, which creates the auth user; the **trigger** creates the profile in the DB.
- **First admin:** Create one user in Supabase Auth, then set `profiles.role = 'admin'` for that user.
