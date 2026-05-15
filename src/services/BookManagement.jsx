import { supabase } from "../lib/supabase";

export const GetBookCategories = async () => {
  const { data, error } = await supabase.rpc("get_enum_values", {
    enum_name: "book_category",
  });
  if (error) throw new Error(error.message);
  if (!Array.isArray(data)) return [];
  return data
    .map((row) => row?.value)
    .filter((value) => typeof value === "string" && value.length > 0);
};

export const AddBook = async (
  title,
  author,
  book,
  category,
  bookCover,
  description,
  language,
  accessTier = "public"
) => {
  let bookCoverUrl = null;
  let bookFileUrl = null;

  if (bookCover && bookCover instanceof File) {
    const ext = bookCover.name.split(".").pop();
    const path = `covers/${crypto.randomUUID()}.${ext}`;
    const { error: coverError } = await supabase.storage
      .from("book-covers")
      .upload(path, bookCover, { upsert: true });
    if (!coverError) {
      const { data: urlData } = supabase.storage
        .from("book-covers")
        .getPublicUrl(path);
      bookCoverUrl = urlData.publicUrl;
    }
  }

  if (book && book instanceof File) {
    const ext = book.name.split(".").pop();
    const path = `files/${crypto.randomUUID()}.${ext}`;
    const { error: fileError } = await supabase.storage
      .from("book-files")
      .upload(path, book, { upsert: true });
    if (!fileError) {
      const { data: urlData } = supabase.storage
        .from("book-files")
        .getPublicUrl(path);
      bookFileUrl = urlData.publicUrl;
    }
  }

  const { data, error } = await supabase
    .from("books")
    .insert({
      title,
      author: author || null,
      category: category || null,
      book_cover_url: bookCoverUrl,
      book_file_url: bookFileUrl,
      description: description || null,
      language: language || null,
      access_tier: accessTier || "public",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const GetBooks = async () => {
  const { data, error } = await supabase
    .from("books")
    .select("id, title, author, category, book_cover_url, book_file_url, description, language, access_tier, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data || []).map((row) => ({
    id: row.id,
    uuid: row.id,
    title: row.title,
    author: row.author || "",
    category: row.category || "",
    bookCover: row.book_cover_url,
    book: row.book_file_url,
    description: row.description || "",
    language: row.language || "",
    accessTier: row.access_tier || "public",
  }));
};

export const EditBook = async (
  id,
  title,
  author,
  category,
  bookCover,
  book,
  description,
  language,
  accessTier
) => {
  const updates = {};
  if (title != null) updates.title = title;
  if (author != null) updates.author = author;
  if (category != null) updates.category = category;
  if (description != null) updates.description = description;
  if (language != null) updates.language = language;
  if (accessTier != null) updates.access_tier = accessTier;

  if (bookCover && bookCover instanceof File) {
    const ext = bookCover.name.split(".").pop();
    const path = `covers/${crypto.randomUUID()}.${ext}`;
    const { error: coverError } = await supabase.storage
      .from("book-covers")
      .upload(path, bookCover, { upsert: true });
    if (!coverError) {
      const { data: urlData } = supabase.storage
        .from("book-covers")
        .getPublicUrl(path);
      updates.book_cover_url = urlData.publicUrl;
    }
  }

  if (book && book instanceof File) {
    const ext = book.name.split(".").pop();
    const path = `files/${crypto.randomUUID()}.${ext}`;
    const { error: fileError } = await supabase.storage
      .from("book-files")
      .upload(path, book, { upsert: true });
    if (!fileError) {
      const { data: urlData } = supabase.storage
        .from("book-files")
        .getPublicUrl(path);
      updates.book_file_url = urlData.publicUrl;
    }
  }

  const { data, error } = await supabase
    .from("books")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return {
    id: data.id,
    uuid: data.id,
    title: data.title,
    author: data.author || "",
    category: data.category || "",
    bookCover: data.book_cover_url,
    book: data.book_file_url,
    description: data.description || "",
    language: data.language || "",
    accessTier: data.access_tier || "public",
  };
};

export const DeleteBook = async (id) => {
  const { error } = await supabase.from("books").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { success: true };
};
