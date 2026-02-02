import { supabase } from "../lib/supabase";

export const AddBlog = async (title, author, text, blogImage) => {
  let imageUrl = null;
  if (blogImage && blogImage instanceof File) {
    const ext = blogImage.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("blog-images")
      .upload(path, blogImage, { upsert: true });
    if (!uploadError) {
      const { data: urlData } = supabase.storage
        .from("blog-images")
        .getPublicUrl(path);
      imageUrl = urlData.publicUrl;
    }
  }

  const { data, error } = await supabase
    .from("blogs")
    .insert({
      title,
      author: author || null,
      content: text || null,
      image_url: imageUrl,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const GetBlogs = async () => {
  const { data, error } = await supabase
    .from("blogs")
    .select("id, title, author, content, image_url, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map((row) => ({
    ...row,
    image: row.image_url,
  }));
};

export const GetBlogById = async (blogId) => {
  const { data, error } = await supabase
    .from("blogs")
    .select("id, title, author, content, image_url, created_at")
    .eq("id", blogId)
    .single();

  if (error) throw new Error(error.message);
  return data ? { ...data, image: data.image_url } : null;
};

export const DeleteBlog = async (blogId) => {
  const { error } = await supabase.from("blogs").delete().eq("id", blogId);
  if (error) throw new Error(error.message);
  return { success: true };
};

export const EditBlog = async (blogId, title, author, text, blogImage) => {
  const updates = {
    title,
    author: author || null,
    content: text || null,
    updated_at: new Date().toISOString(),
  };

  if (blogImage && blogImage instanceof File) {
    const ext = blogImage.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("blog-images")
      .upload(path, blogImage, { upsert: true });
    if (!uploadError) {
      const { data: urlData } = supabase.storage
        .from("blog-images")
        .getPublicUrl(path);
      updates.image_url = urlData.publicUrl;
    }
  }

  const { data, error } = await supabase
    .from("blogs")
    .update(updates)
    .eq("id", blogId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data ? { ...data, image: data.image_url } : null;
};
