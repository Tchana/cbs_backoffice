# CBS Backoffice — Full Application Documentation

**Center for Biblical Studies (CBS) Admin Dashboard**

This document describes every major feature of the CBS backoffice web application: what it does, who can use it, how data flows, and how it connects to Supabase and the mobile student app.

---

## Table of contents

1. [Introduction](#1-introduction)
2. [Architecture and technology](#2-architecture-and-technology)
3. [Getting started](#3-getting-started)
4. [Authentication and roles](#4-authentication-and-roles)
5. [Application layout and navigation](#5-application-layout-and-navigation)
6. [Feature reference — every page in detail](#6-feature-reference--every-page-in-detail)
7. [Finance and subscriptions (deep dive)](#7-finance-and-subscriptions-deep-dive)
8. [Database and backend](#8-database-and-backend)
9. [Edge functions](#9-edge-functions)
10. [Relationship to the mobile app](#10-relationship-to-the-mobile-app)
11. [Development, testing, and deployment](#11-development-testing-and-deployment)
12. [Troubleshooting](#12-troubleshooting)
13. [Related setup guides](#13-related-setup-guides)

---

## 1. Introduction

### 1.1 Purpose

The CBS backoffice is an **administrative dashboard** for staff at the Center for Biblical Studies. It is used to:

- Manage users (students, library subscribers, teachers, admins)
- Create and maintain courses, lessons, assignments, and books
- Publish announcements and blogs
- Moderate course forums
- Track subscription payments and course fees
- Grant, suspend, or restore student access manually

**Students and library users do not use this dashboard.** They use the separate mobile application. The backoffice is for **admins** and **teachers**.

### 1.2 Account creation model

- There is **no public self-registration** in production use.
- The login page shows: *"Accounts are created by admins from the dashboard after login."*
- Admins create all user accounts via the **Users** or **Teachers** pages.
- The first admin must be created manually in Supabase Auth, then given `role = admin` in the `profiles` table.

### 1.3 Default currency

Financial amounts throughout the app are displayed in **XAF** (Central African CFA franc) unless otherwise noted in the database.

---

## 2. Architecture and technology

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite 6, React Router 6 |
| Styling | Tailwind CSS, Framer Motion (animations) |
| Charts | Recharts |
| PDF receipts | jsPDF (client-side generation) |
| Backend | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| Client SDK | `@supabase/supabase-js` |

### 2.1 Project structure

```
cbs_backoffice/
├── src/
│   ├── App.jsx                 # Routes and auth gate
│   ├── main.jsx                # App entry point
│   ├── components/             # UI components by domain
│   ├── contexts/               # ApiLoaderContext (global loading overlay)
│   ├── lib/                    # supabase.js, auth.js helpers
│   ├── pages/                  # One page per sidebar section
│   └── services/               # Supabase data access layer
├── supabase/
│   ├── migrations/             # SQL schema (run in order)
│   └── functions/              # Deno edge functions
├── e2e/                        # Playwright end-to-end tests
├── SUPABASE_SETUP.md           # Initial Supabase setup
└── SUBSCRIPTION_PAYMENTS_SETUP.md  # Payment integration setup
```

### 2.2 Data flow

1. User logs in → Supabase Auth session created.
2. App stores `authToken`, `auth`, and `role` in `localStorage`.
3. Each page calls **service functions** in `src/services/`.
4. Services use the Supabase client to query Postgres, upload files to Storage, or invoke Edge Functions.
5. **Row Level Security (RLS)** on the database enforces permissions even if the UI allows an action.

---

## 3. Getting started

### 3.1 Prerequisites

- Node.js (LTS recommended)
- A Supabase project
- Supabase CLI (optional, for deploying edge functions)

### 3.2 Environment variables

Copy `.env.example` to `.env` and set:

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon (public) key |

Optional — for E2E tests only:

| Variable | Description |
|----------|-------------|
| `E2E_EMAIL` | Backoffice test user email |
| `E2E_PASSWORD` | Backoffice test user password |
| `E2E_PORT` | Dev server port (default `4173`) |
| `E2E_BASE_URL` | Base URL for Playwright |

Payment secrets (`PAWAPAY_*`) belong on **Supabase Edge Functions**, not in the Vite `.env` for production.

### 3.3 Install and run

```bash
npm install
npm run dev      # Development server
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # ESLint
```

### 3.4 Database setup

Run all files in `supabase/migrations/` **in numeric order** (001 through 032) in the Supabase SQL Editor, or use the Supabase CLI migration workflow.

See [Section 8](#8-database-and-backend) for a migration summary.

### 3.5 First admin user

1. Supabase Dashboard → **Authentication → Users → Add user**
2. Table Editor → **profiles** → set `role` to `admin` for that user's UUID
3. Log in to the backoffice with that account

Detailed steps: `SUPABASE_SETUP.md`

---

## 4. Authentication and roles

### 4.1 Login flow

**Route:** `/login`

1. User enters email and password.
2. App calls `supabase.auth.signInWithPassword`.
3. App loads `profiles.role` for the authenticated user.
4. If role is **`student`**, login is **rejected** (session signed out, error shown).
5. On success, token and role are stored in `localStorage`.
6. User is redirected to `/overview` (admins) or can navigate freely.

**Forgot password** (`/forgot-password`, `/forgot-password/verify`):

- Available for **admin accounts only**.
- Validates email via the `validate-admin-reset` edge function before sending OTP.
- User enters OTP + new password on the verify page.

### 4.2 Roles

| Role | Backoffice login | Sidebar access | Primary use |
|------|------------------|----------------|-------------|
| **admin** | Yes | Full (Overview, Admin, all modules) | Full CRUD, finance, subscriptions |
| **teacher** | Yes | All except Overview and Admin | Teach, view content, announcements, forum |
| **student** | **Blocked** | N/A | Mobile app only |
| **library_user** | Technically allowed* | Same as teacher minus admin pages | Mobile library app; rarely uses backoffice |

\*Only `student` is explicitly blocked in code; `library_user` is intended for mobile.

### 4.3 Profile entitlement fields (mobile + admin)

Stored on `profiles` and managed from the Users detail modal:

| Field | Values | Meaning |
|-------|--------|---------|
| `role` | `admin`, `teacher`, `student`, `library_user` | Account type |
| `subscription_type` | `none`, `library_user`, `student` | What the user is entitled to consume |
| `school_max_level` | Integer ≥ 0 | Highest course **level** a student can access (e.g. level 1, 2, 3 courses) |

### 4.4 Subscription access states

On active `user_subscriptions` rows:

| State | Effect on mobile app |
|-------|---------------------|
| `full` | Normal access; can submit assignments |
| `downgraded` | Can view content; **cannot** submit assignments |
| `suspended` | Paid content access blocked |

Missed installment due dates do **not** auto-suspend users; admins change access manually.

### 4.5 UI vs database permissions

The app uses `isAdmin()` (from `localStorage` role) to hide admin-only buttons and pages.

**Important:** Some UI elements are visible to teachers but will return **403** from Supabase if the teacher lacks DB permission (e.g. creating users). Always treat RLS as the source of truth.

### 4.6 Logout

Sidebar **Logout** clears all `localStorage` and reloads the page. It does not explicitly call `supabase.auth.signOut()` before reload.

---

## 5. Application layout and navigation

### 5.1 Authenticated layout

After login, every page shares:

- **Sidebar** (left): collapsible navigation, logout
- **Header** (top of content): page title
- **Main content area**

### 5.2 Sidebar items

**Admin sees:**

| Menu item | Route |
|-----------|-------|
| Overview | `/overview` |
| Admin | `/admin` |
| Users | `/users` |
| Teachers | `/teachers` |
| Courses | `/course` |
| Lessons | `/lessons` |
| Books | `/books` |
| Blogs | `/blogs` |
| Announcements | `/announcements` |
| Forum | `/forum` |
| Finance | `/finance` |
| Subscriptions | `/subscriptions` |
| Account Info | `/account-info` |

**Teacher sees:** Same list **without** Overview and Admin.

### 5.3 Global loading indicator

`ApiLoaderContext` wraps API calls with a loading overlay so long Supabase operations show feedback across the app.

---

## 6. Feature reference — every page in detail

### 6.1 Overview (`/overview`) — Admin only

**Purpose:** Dashboard with high-level statistics.

**Behavior:**

- Non-admins are redirected to `/course`.
- Loads counts: total users, teachers, students, admins, courses, books.
- **Stat cards** are clickable shortcuts to Users, Teachers, Courses, or Books.
- **User ratio chart** (pie): breakdown of teachers, students, admins.
- Shows an error banner if data cannot load (often RLS / missing admin role).

---

### 6.2 Admin (`/admin`) — Admin only (sidebar)

**Purpose:** Manage administrator accounts.

**Features:**

- Lists users where `role = admin`.
- Same table tooling as Users page: search, pagination (10 per page), refresh.
- **Add admin:** opens registration modal (name, email, password, role, avatar).
- **View / Edit / Delete** admin accounts.

---

### 6.3 Users (`/users`)

**Purpose:** Central hub for **student** and **library user** accounts.

**Note:** `/students` redirects here.

#### Tabs

| Tab | Shows |
|-----|-------|
| Both | Students + library users |
| Students | `role = student` |
| Library Users | `role = library_user` |

#### Table features

- **Search:** first name, last name, email, role
- **Pagination:** 10 rows per page; jump-to-page input
- **Refresh** button
- **Actions per row:**
  - **View** — opens detailed user modal (subscription management)
  - **Edit** — update profile, role, subscription type, school level, avatar
  - **Delete** — with confirmation

#### Register new user (admin)

Modal fields:

- First name, last name, email, password
- Role: student or library_user (depending on tab)
- Subscription type and school max level (for students)
- Profile picture (drag-and-drop or click to upload)

Creates auth user via **`create-user`** edge function.

#### User detail modal (View)

Shows account info plus **subscription management**:

- Current subscription status and access state badge
- **Grant / Extend Trimester** — manual subscription grant (plan code + reason)
- **Suspend access** / **Restore access** — changes `access_state` on active subscription
- Subscription history with installment breakdown

---

### 6.4 Teachers (`/teachers`)

**Purpose:** Manage teacher accounts and extended teacher profiles.

#### Table

- Filtered to `role = teacher`
- Search and pagination same as Users

#### Teacher-specific fields

| Field | Description |
|-------|-------------|
| Phone | Contact number |
| Vocation | Teacher's calling/ministry context |
| Testimony | Personal testimony text |
| Journey | Background / journey narrative |

#### Actions

- **View** — read-only teacher profile modal
- **Edit / Register / Delete** — admin-gated in UI

---

### 6.5 Courses (`/course`)

**Purpose:** Manage the course catalog and drill into course content.

#### Course list (`CoursesTable`)

- Search by title, description, level, teacher name
- Columns: title, teacher, level, active status, actions

#### Admin actions

- **Create course** — modal: cover image, title, description, level, teacher (by first/last name lookup)
- **Edit course** metadata
- **Delete course**
- **Toggle active/inactive** — inactive courses are not accessible to students on mobile

#### View course (all staff)

Opens **Course View Modal** with three major sections:

**1. Lessons (within course)**

- Expand/collapse each lesson
- Add lesson: title, description, PDF file upload
- Edit lesson: update metadata or replace PDF
- Delete lesson (with confirmation)

**2. Assignments**

- List all assignments for the course (published and draft)
- **Create assignment** — title, description, optional PDF material, due date, questions:
  - **MCQ (single choice)** — auto-graded when students submit
  - **Open PDF** — student uploads answer PDF; teacher grades manually
- **Publish / unpublish** assignment
- Set / update **due date**
- **Grade submissions** — opens grading modal for open-ended questions
- Delete assignment

**3. Course fee (catalog)**

- Set fee amount and notes for this course
- Used by the course payments system (Finance → Course payments)

**Side effect on create:** A forum **room** is automatically created with the same name as the course (DB trigger + app-level insert).

---

### 6.6 Lessons (`/lessons`)

**Purpose:** Flat list of **all lessons across all courses** (not scoped to one course).

#### Stats

- Total lesson count

#### Actions

- **Create lesson** — select course, title, description, PDF
- **Edit lesson**
- **Delete lesson**
- **View lesson** — read-only details and file link

Useful when staff need to find or edit a lesson without opening the parent course first.

---

### 6.7 Books (`/books`)

**Purpose:** Digital library management for the mobile app.

#### Stat cards

- Total books
- Public books
- Subscriber-only books
- Number of categories

#### Filters

- **Search** by title, author, description
- **Category filter** dropdown (from `book_category` enum)

#### Add / edit book (admin)

| Field | Description |
|-------|-------------|
| Title, author | Bibliographic info |
| Category | From predefined enum |
| Language | Book language |
| Description | Summary |
| Cover image | Required on create |
| Book file | Required on create (PDF or document) |
| Access tier | `public` (anyone) or `subscriber` (paid library/student access) |

#### View book

Read-only modal with download/view links.

---

### 6.8 Blogs (`/blogs`)

**Purpose:** Publish articles/news for the mobile app or public site.

#### Features

- List all blogs with search
- **Add blog** (admin): title, author, rich text content, featured image
- **Edit / delete** (admin)
- **View** (all staff): read-only

Files stored in Supabase Storage bucket `blog-images`.

---

### 6.9 Announcements (`/announcements`)

**Purpose:** Push notices to students on mobile.

#### Create announcement form

| Field | Options |
|-------|---------|
| Title | Required text |
| Body | Required message (multiline) |
| Course scope | **Global** (all students) or specific course |
| Published | Checkbox — draft vs live |
| Visibility window | 1, 3, 7, 14, or 30 days — auto-expires after `visible_until` |

#### Recent announcements list

Per announcement:

- Change visibility window
- **Publish / Unpublish**
- **Delete** — allowed for **admin** or the **creator** only

Teachers can create announcements but cannot delete others' announcements (enforced in UI and RLS).

---

### 6.10 Forum (`/forum`)

**Purpose:** Course-linked discussion rooms for staff (and students on mobile).

#### Layout

Two columns:

**Left — Rooms**

- Lists all forum rooms (auto-created per course)
- Refresh button
- Click to select room

**Right — Messages**

- Date headers: Today, Yesterday, or formatted date
- Messages show sender name, time, content
- Alignment distinguishes current user vs others
- **Composer:** textarea + Send (disabled without room or empty message)

#### Data model

- `rooms` — one per course (typically)
- `messages` — text content, author, timestamp

---

### 6.11 Finance (`/finance`)

Four sub-tabs — see [Section 7](#7-finance-and-subscriptions-deep-dive) for full detail.

| Tab | Purpose |
|-----|---------|
| Subscription payments | Mobile money payments from pawaPay |
| Course fees (legacy) | Old per-student fee ledger |
| Course fees | Set catalog fee per course |
| Course payments | Modern per-student per-course payment tracking |

---

### 6.12 Subscriptions (`/subscriptions`)

**Purpose:** Configure plans, installments, receivables, and in-app payment toggle.

See [Section 7.2](#72-subscriptions-page).

---

### 6.13 Account Info (`/account-info`)

**Purpose:** Read-only view of the **logged-in user's** profile.

Displays:

- Avatar
- Full name
- Role
- Email

No edit actions on this page (profile edits for self are not implemented here).

---

## 7. Finance and subscriptions (deep dive)

### 7.1 Finance page tabs

#### Tab 1: Subscription payments

Shows **`payment_transactions`** from the mobile app (pawaPay mobile money).

**Summary stats:** total, succeeded, pending, failed

**Table columns:** date/time, user, plan, amount, status, reference

Use this to audit mobile checkout attempts and confirm webhook processing.

#### Tab 2: Course fees (legacy)

Uses view **`v_student_finance_summary`** — older model with a single balance per student.

**Workflow:**

1. Browse students with outstanding balances
2. Click student → see **ledger** (charges + payments)
3. **Add charge** — manual debt entry (amount + description)
4. **Record payment** — cash, mobile money, bank transfer, or other
5. **Generate PDF receipt** — client-side jsPDF with receipt number stored in DB

Payments allocate to charges FIFO via RPC `record_payment_and_allocate_fifo`.

#### Tab 3: Course fees (catalog)

**Component:** `CourseFeesCatalogPanel`

- Lists all courses with configured fee amounts
- Set or update fee amount + notes per course
- Remove fee from catalog

Uses `course_fees` table and RPCs `upsert_course_fee` / `delete_course_fee`.

#### Tab 4: Course payments (current model)

**Component:** `CoursePaymentsPanel`

Per-student view of what they owe **per course**.

**Capabilities:**

- View summary: total owed, paid, credit across courses
- **Record deposit** — payment allocated across courses (waterfall logic)
- **Apply credit** — move overpayment to another course
- **Void payment** or **void allocation** — accounting corrections
- Generate PDF receipts and reports

Uses views `v_student_course_payment_summary`, `v_student_course_balances` and RPCs such as `record_student_course_payment`.

---

### 7.2 Subscriptions page

#### In-app payments toggle

Checkbox: **In-app subscription payments**

- Calls RPC `set_subscription_payments_enabled`
- When **disabled** (default after migration): mobile app shows a message instead of checkout; admins grant access manually
- When **enabled**: students can pay via mobile money in the app

#### Receivables tabs

| Tab | Shows subscribers who are... |
|-----|------------------------------|
| Active | In good standing |
| Owing | Have unpaid installments (not yet overdue) |
| Overdue | Past due on installments |
| Downgraded | Access state = downgraded |
| Suspended | Access state = suspended |

**Per-row actions:**

- Downgrade / Restore / Suspend access
- Record manual payment (when not using app checkout)

**Export CSV** of filtered receivables.

Expandable **installment breakdown** per subscription.

#### Plan prices editor

Edit for each `subscription_plan`:

- Name
- Price amount
- Duration (months)
- Active flag

Seed plans include `student_trimester` and `library_trimester`.

#### Plan installment schedules

For selected plan, define installments:

| Field | Meaning |
|-------|---------|
| Installment number | Order (1, 2, 3…) |
| Label | Display name |
| Amount | XAF due for this installment |
| Due after days | Days from subscription start |

When a subscription is created, **`user_subscription_installments`** rows are generated from this schedule.

---

### 7.3 Payment flow (mobile → backoffice)

```
Student app → create-subscription-payment (edge function)
           → pawaPay deposit initiated
           → Student approves on phone
           → pawaPay webhook → payment-webhook (edge function)
           → payment_transactions updated
           → record_subscription_installment_payment RPC
           → user entitlements updated (full access)
```

Backoffice **Finance → Subscription payments** and **Subscriptions → Receivables** reflect this data.

Setup: `SUBSCRIPTION_PAYMENTS_SETUP.md`

---

## 8. Database and backend

### 8.1 Migration overview (001–032)

Run in order. Grouped by domain:

| Range | Domain |
|-------|--------|
| 001–006 | Core schema: profiles, courses, lessons, books, blogs; RLS; phone |
| 007 | Assignments, enrollments, MCQ auto-grading |
| 008–005 | Storage buckets and policies |
| 009–015 | Announcements, visibility windows, delete scope |
| 010 | Auto-create forum room on new course |
| 011–012 | Test seed data + cleanup |
| 013 | Legacy student fee ledger |
| 014 | Subscription types, library tiers, book access tiers |
| 016–021 | Subscription plans, payments, installments, webhook logs, entitlement sync |
| 017, 022 | Paid access RLS; level-based course access (replaces enrollment gating) |
| 023 | Teacher profile fields (vocation, testimony, journey) |
| 024–031 | Per-course payment system, waterfall allocation, app balance RPC |
| 032 | Admin WhatsApp setting in app_settings |

### 8.2 Core tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profile linked 1:1 to `auth.users` |
| `courses` | Course catalog (title, level, teacher, active, price) |
| `lessons` | PDF lessons belonging to a course |
| `books` | Library items with access tier |
| `blogs` | Blog posts |
| `announcements` | Scoped notices with expiry |
| `announcement_reads` | Mobile read tracking |
| `rooms`, `messages` | Forum |
| `assignments` + related tables | Assignments, MCQ, submissions, grading |
| `enrollments` | Legacy; self-enroll disabled in 022 |
| `subscription_plans` | Plan definitions |
| `user_subscriptions` | Active/historical subscriptions |
| `subscription_plan_installments` | Template installment schedule |
| `user_subscription_installments` | Per-user installment rows |
| `payment_transactions` | pawaPay payment records |
| `course_fees` | Catalog fee per course |
| `student_course_payments` | Student payments toward courses |
| `student_course_payment_allocations` | How payments apply to courses |
| `student_fee_*` | Legacy fee charges/payments/receipts |
| `app_settings` | Global toggles (payments enabled, WhatsApp) |

### 8.3 Key database views

| View | Used by |
|------|---------|
| `v_user_subscription_status` | User detail modal |
| `v_subscription_receivables` | Subscriptions page |
| `v_student_finance_summary` | Finance legacy tab |
| `v_course_fees` | Course fee catalog |
| `v_student_course_balances` | Course payments |
| `v_student_course_payment_summary` | Course payments summary |

### 8.4 Access control functions (mobile)

| Function | Purpose |
|----------|---------|
| `current_user_has_library_access()` | Can access subscriber books |
| `current_user_has_course_access()` | Has student subscription |
| `current_user_subscription_access_state()` | full / downgraded / suspended |
| `current_user_school_max_level()` | Max course level number |
| `current_user_can_access_course(course_id)` | Level + subscription check |
| `current_user_can_submit_assignments()` | Requires full access |

### 8.5 Storage buckets

| Bucket | Content |
|--------|---------|
| `avatars` | Profile pictures |
| `course-covers` | Course cover images |
| `lesson-files` | Lesson PDFs |
| `book-covers` | Book cover images |
| `book-files` | Book documents |
| `blog-images` | Blog featured images |
| `assignment-files` | Assignment PDF materials |
| `assignment-submissions` | Student submission uploads |

Policies in migrations 005 and 008.

### 8.6 RLS pattern summary

- **`current_user_role()`** — returns logged-in user's role (case-insensitive)
- **Admins** — broad CRUD on management tables
- **Teachers** — read users/courses/books/blogs; full CRUD on lessons; scoped write on own-course assignments and announcements
- **Students (mobile)** — read gated by subscription, level, and access state

---

## 9. Edge functions

| Function | JWT verify | Called from | Purpose |
|----------|------------|-------------|---------|
| `create-user` | Off (recommended) | Backoffice admin | Create auth user + profile; validates admin JWT internally |
| `validate-admin-reset` | — | Forgot password page | Ensure email belongs to admin before OTP |
| `create-subscription-payment` | On | Mobile app | Start pawaPay deposit; create pending transaction |
| `payment-webhook` | Off | pawaPay servers | Verify deposit; mark installment paid; grant access |

### Required secrets (all functions)

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Payment functions additionally need

- `PAWAPAY_API_TOKEN`
- `PAWAPAY_API_BASE_URL`
- `PAWAPAY_DEFAULT_PROVIDER` (optional)
- `PAWAPAY_PHONE_COUNTRY_CODE` (optional, default `237`)

---

## 10. Relationship to the mobile app

The backoffice and mobile app share **one Supabase project**.

| Backoffice manages | Mobile app consumes |
|--------------------|---------------------|
| Courses, lessons, assignments | Student learning, submissions |
| Books, blogs | Library and reading |
| Announcements | Notification feed |
| Forum rooms | Course discussions |
| Subscriptions, access states | Gated content access |
| Course fees / payments | Balance display, payment prompts |

### Student course access model (current)

After migration 022:

- Students do **not** self-enroll in courses.
- Access is determined by:
  1. Active **student** subscription (`subscription_type = student`)
  2. **`school_max_level`** on profile vs **course level** (numeric part of level field)
  3. Course **`active = true`**
  4. Subscription **`access_state`** (full / downgraded / suspended)

### Library users

- `subscription_type = library_user` or library plan
- Access subscriber-tier books only (not full courses)

---

## 11. Development, testing, and deployment

### 11.1 Scripts

```bash
npm run dev          # Local development
npm run build        # Production bundle → dist/
npm run preview      # Serve dist/ locally
npm run lint         # ESLint
npm run test:e2e     # Playwright tests
npm run test:e2e:ui  # Playwright with UI
```

### 11.2 E2E test coverage (`e2e/app-flow.spec.js`)

**Smoke (no auth):**

- Login page renders email, password, Login button

**Authenticated** (requires `E2E_EMAIL` + `E2E_PASSWORD`):

- Login success
- Navigate: Courses, Lessons, Books, Blogs, Announcements, Forum, Account Info
- Forum: rooms list + composer visible
- Announcements: create form + list sections visible
- Courses: "Create New Course" modal opens

**Not covered:** Admin, Users, Teachers, Finance, Subscriptions, Overview, CRUD operations, payments, password reset.

### 11.3 Production deployment checklist

1. Run all migrations 001–032
2. Create storage buckets + run storage policy migrations
3. Deploy all 4 edge functions with secrets
4. Create first admin in Auth + set `profiles.role = admin`
5. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in hosting environment
6. Build: `npm run build`; deploy `dist/` to static host
7. Configure pawaPay webhook URL → `payment-webhook`
8. In Subscriptions page: configure plan prices + installments; enable in-app payments when ready

---

## 12. Troubleshooting

| Problem | Likely cause | Fix |
|---------|--------------|-----|
| 403 on Overview | User is not admin | Set `profiles.role = admin` |
| 403 on file upload | Storage RLS missing | Run `005_storage_policies.sql` and assignment storage migration |
| 401 creating user | Edge function JWT gateway | Disable "Verify JWT" on `create-user`; re-login; verify `.env` project match |
| "Student account can't be logged in" | Student tried backoffice | Use admin/teacher account |
| Forum shows no rooms | `rooms` table empty | Create courses (auto-trigger) or insert rooms manually |
| Subscription payments not appearing | Webhook not configured | Set pawaPay callback URL; check `payment_webhook_events` logs |
| Course not visible on mobile | Level mismatch | Increase student's `school_max_level` or adjust course level |
| Assignments blocked | Downgraded access | Restore `access_state` to `full` on Subscriptions or User detail |

---

## 13. Related setup guides

| Document | Contents |
|----------|----------|
| `SUPABASE_SETUP.md` | Project creation, env vars, first migrations, create-user function, storage, first admin |
| `SUBSCRIPTION_PAYMENTS_SETUP.md` | pawaPay integration, installment setup, access behavior, smoke tests |
| `.env.example` | Required environment variable template |

---

## Appendix A — Service layer reference

| Service file | Primary responsibilities |
|--------------|-------------------------|
| `AuthenticationManagement.jsx` | Login, signup, password reset, admin user creation |
| `UsersManagement.jsx` | Profile CRUD, subscription status/history, manual grants, access state |
| `CourseManagement.jsx` | Courses CRUD, active toggle, teacher lookup, forum room on create |
| `LessonManagement.jsx` | Lesson CRUD, PDF upload |
| `AssignmentManagement.jsx` | Assignments, MCQ questions, submissions, open PDF grading |
| `BookManagement.jsx` | Books CRUD, categories enum, file uploads |
| `BlogManagement.jsx` | Blogs CRUD, image upload |
| `AnnouncementManagement.jsx` | Announcements CRUD, actor role for delete permission |
| `ForumManagement.jsx` | Rooms list, messages, send message |
| `FinanceManagement.jsx` | Legacy fees, subscription transactions, receipts |
| `CourseFeeManagement.jsx` | Course fee catalog RPCs |
| `CoursePaymentManagement.jsx` | Per-course student payments, credits, voids |
| `AccountInfoManagement.jsx` | Current user profile (`WhoAmI`) |

---

## Appendix B — Route map (quick reference)

| Route | Page | Min role |
|-------|------|----------|
| `/login` | Login | Public |
| `/forgot-password` | Forgot password | Public |
| `/forgot-password/verify` | OTP verify | Public |
| `/overview` | Dashboard | Admin |
| `/admin` | Admin users | Admin (sidebar) |
| `/users` | Users hub | Teacher+ |
| `/teachers` | Teachers | Teacher+ |
| `/course` | Courses | Teacher+ |
| `/lessons` | All lessons | Teacher+ |
| `/books` | Library | Teacher+ |
| `/blogs` | Blogs | Teacher+ |
| `/announcements` | Announcements | Teacher+ |
| `/forum` | Forum | Teacher+ |
| `/finance` | Finance | Teacher+ |
| `/subscriptions` | Subscriptions | Teacher+ |
| `/account-info` | My profile | Teacher+ |

---

*Document generated for CBS Backoffice. For schema changes, always refer to the latest files in `supabase/migrations/`.*
