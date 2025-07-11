const API_URL = "https://mardoche.pythonanywhere.com";

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

  const response = await fetch(`${API_URL}/book/`, {
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

  const response = await fetch(`${API_URL}/book/`, {
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
