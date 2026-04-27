import { supabase } from "../lib/supabase";

export const WhoAmI = async () => {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, avatar_url, role")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    throw new Error("Failed to fetch account info");
  }

  return {
    uuid: profile.id,
    role: profile.role || "",
    email: profile.email || user.email,
    firstName: profile.first_name || "",
    lastName: profile.last_name || "",
    pImage: profile.avatar_url || "",
  };
};
