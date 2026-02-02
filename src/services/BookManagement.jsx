import { supabase } from "../lib/supabase";

export const AddBook = async (
  title,
  author,
  book,
  category,
  bookCover,
  description,
  language
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
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const GetBooks = async () => {
  const { data, error } = await supabase
    .from("books")
    .select("id, title, author, category, book_cover_url, book_file_url, description, language, created_at")
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
  }));
};
