import { supabase } from "../lib/supabase";
import { FunctionsHttpError } from "@supabase/supabase-js";

export const login = async (email, password) => {
  let data, error;
  try {
    const result = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    data = result.data;
    error = result.error;
  } catch (err) {
    const msg = err?.message || "";
    if (msg.toLowerCase().includes("fetch") || msg.toLowerCase().includes("network")) {
      const url = import.meta.env.VITE_SUPABASE_URL;
      throw new Error(
        "Cannot reach Supabase. Check: (1) .env has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, " +
        "(2) URL is correct (e.g. https://xxxx.supabase.co), (3) restart dev server after changing .env. " +
        (url ? `Current URL: ${url}` : "No VITE_SUPABASE_URL set.")
      );
    }
    throw err;
  }

  if (error) {
    throw new Error(error.message || "Invalid email or password");
  }

  const session = data.session;
  if (!session) throw new Error("No session returned");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, role, avatar_url")
    .eq("id", session.user.id)
    .single();

  return {
    token: session.access_token,
    user: session.user,
    role: profile?.role ?? "teacher",
  };
};

/**
 * Create a new user (auth + profile). Only callable by an admin; use the create-user Edge Function.
 * When a profile is created, the DB trigger creates the profile row from auth user metadata.
 */
export const createUserAsAdmin = async (
  email,
  password,
  firstname,
  lastname,
  role,
  p_image
) => {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session?.access_token) {
    throw new Error("You must be logged in to create users. Please log in again.");
  }

  // Use a fresh token so the gateway accepts the JWT (avoids 401 Invalid JWT)
  const { data: { session: freshSession }, error: refreshError } =
    await supabase.auth.refreshSession({ refresh_token: session.refresh_token });
  if (refreshError) {
    throw new Error("Session expired or invalid. Please log in again.");
  }
  const token = freshSession?.access_token ?? session.access_token;
  if (!token) {
    throw new Error("No session token. Please log in again.");
  }

  const { data, error } = await supabase.functions.invoke("create-user", {
    body: {
      email,
      password,
      first_name: firstname,
      last_name: lastname,
      role: role || "teacher",
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (error) {
    // Parse response body from Edge Function (401/403/400 etc.)
    let body = {};
    if (error instanceof FunctionsHttpError && error.context && typeof error.context.json === "function") {
      try {
        body = await error.context.json();
      } catch {
        // ignore
      }
    }
    const msg = body.detail || body.error || error.message;
    const status = error.context?.status ?? 0;
    const is401 = status === 401;
    const hint = is401
      ? " Log out, log in again, then retry. If it persists: ensure .env (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) matches the project where the create-user Edge Function is deployed, and in Supabase Dashboard → Edge Functions → create-user → disable 'Verify JWT' so the function validates the token itself."
      : "";
    throw new Error((msg || "Failed to create user") + hint);
  }

  if (data?.error) {
    throw new Error(data.detail || data.error);
  }

  const userId = data?.id;
  if (userId && p_image && typeof p_image.name === "string") {
    const fileExt = p_image.name.split(".").pop();
    const fileName = `${userId}/avatar.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, p_image, { upsert: true });

    if (!uploadError) {
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);
      await supabase
        .from("profiles")
        .update({ avatar_url: urlData.publicUrl })
        .eq("id", userId);
    }
  }

  return data;
};

/** Public signup from the login page (creates auth user; trigger creates profile). */
export const signup = async (
  email,
  password,
  firstname,
  lastname,
  p_image,
  role
) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstname,
        last_name: lastname,
        role: role || "teacher",
      },
    },
  });

  if (error) {
    throw new Error(error.message || "Signup failed");
  }

  if (data.user && p_image && typeof p_image.name === "string") {
    const fileExt = p_image.name.split(".").pop();
    const fileName = `${data.user.id}/avatar.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, p_image, { upsert: true });

    if (!uploadError) {
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);
      await supabase
        .from("profiles")
        .update({ avatar_url: urlData.publicUrl })
        .eq("id", data.user.id);
    }
  }

  return data;
};

export const updatePassword = async (email, password) => {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(error.message);
};
