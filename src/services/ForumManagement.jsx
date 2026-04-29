import { supabase } from "../lib/supabase";

export const GetRooms = async () => {
  const { data, error } = await supabase
    .from("rooms")
    .select("id,name,description,is_private,is_deleted,created_at")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
};

export const GetRoomMessages = async (roomId) => {
  if (!roomId) return [];

  const { data, error } = await supabase
    .from("messages")
    .select("id,room_id,user_id,content,is_deleted,created_at,user:profiles(id,first_name,last_name,email)")
    .eq("room_id", roomId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
};

export const SendRoomMessage = async ({ roomId, content }) => {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  if (!user?.id) throw new Error("Not authenticated");

  const payload = {
    room_id: roomId,
    user_id: user.id,
    content: content.trim(),
    is_deleted: false,
  };

  const { data, error } = await supabase
    .from("messages")
    .insert(payload)
    .select("id,room_id,user_id,content,created_at,user:profiles(id,first_name,last_name,email)")
    .single();

  if (error) throw new Error(error.message);
  return data;
};

