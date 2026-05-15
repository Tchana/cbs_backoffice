import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const DEFAULT_PASSWORD = process.env.E2E_PASSWORD || "P@ssword123";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing env. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (service role, not anon)."
  );
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const usersToEnsure = [
  { email: "admin.e2e@cbs.test", password: DEFAULT_PASSWORD, role: "admin" },
  { email: "teacher.e2e@cbs.test", password: DEFAULT_PASSWORD, role: "teacher" },
  { email: "student.e2e@cbs.test", password: DEFAULT_PASSWORD, role: "student" },
  { email: "library.e2e@cbs.test", password: DEFAULT_PASSWORD, role: "library_user" },
];

async function ensureUser({ email, password, role }) {
  const { data: existing, error: getErr } = await admin.auth.admin.getUserByEmail(
    email
  );
  if (getErr) throw getErr;

  if (existing?.user) {
    const { data, error } = await admin.auth.admin.updateUserById(
      existing.user.id,
      {
        password,
        email_confirm: true,
        user_metadata: {
          ...(existing.user.user_metadata || {}),
          role,
          first_name: role.split("_").map((s) => s[0]?.toUpperCase() + s.slice(1)).join(" "),
          last_name: "E2E",
        },
      }
    );
    if (error) throw error;
    return data.user;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role,
      first_name: role.split("_").map((s) => s[0]?.toUpperCase() + s.slice(1)).join(" "),
      last_name: "E2E",
    },
  });
  if (error) throw error;
  return data.user;
}

async function main() {
  const created = [];
  for (const u of usersToEnsure) {
    const user = await ensureUser(u);
    created.push(user);
  }

  console.log("E2E Auth users ensured:");
  for (const u of created) {
    console.log(`- ${u.email} -> ${u.id}`);
  }

  console.log("\nNext: run E2E_TEST_SEED.sql in SQL editor.");
}

main().catch((e) => {
  console.error("Failed:", e?.message || e);
  process.exit(1);
});

