const API_URL = "http://127.0.0.1:8000/";

export const AddBook = async (
  title,
  author,
  book,
  category,
  bookCover,
  description,
  language
) => {
  const Token = localStorage.getItem("authToken");
  const formData = new FormData();
  formData.append("title", title);
  formData.append("author", author);
  formData.append("book", book);
  formData.append("category", category);
  formData.append("bookCover", bookCover);
  formData.append("description", description);
  formData.append("language", language);

  const response = await fetch(`${API_URL}/book/add`, {
    method: "POST",
    headers: {
      Authorization: `Token ${Token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(JSON.stringify(await response.json()));
  }
  return await response.json();
};

export const GetBooks = async () => {
  const Token = localStorage.getItem("authToken");

  const response = await fetch(`${API_URL}/book/get`, {
    method: "GET",
    headers: {
      Authorization: `Token ${Token}`,
    },
  });

  if (!response.ok) {
    throw new Error(JSON.stringify(await response.json()));
  }
  return await response.json();
};
