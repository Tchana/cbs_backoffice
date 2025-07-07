const API_URL = "https://mardoche.pythonanywhere.com";

export const AddBlog = async (
  title,
  author,
  text,
  blogImage
) => {
  const Token = localStorage.getItem("authToken");
  const formData = new FormData();
  formData.append("title", title);
  formData.append("author", author);
  formData.append("content", text);
  if (blogImage) {
    formData.append("image", blogImage);
  }

  const response = await fetch(`${API_URL}/blogs/`, {
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

export const GetBlogs = async () => {
  const Token = localStorage.getItem("authToken");

  const response = await fetch(`${API_URL}/blogs/`, {
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

export const GetBlogById = async (blogId) => {
  const Token = localStorage.getItem("authToken");

  const response = await fetch(`${API_URL}/blogs/${blogId}/`, {
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

export const DeleteBlog = async (blogId) => {
  const Token = localStorage.getItem("authToken");

  const response = await fetch(`${API_URL}/blogs/${blogId}/`, {
    method: "DELETE",
    headers: {
      Authorization: `Token ${Token}`,
    },
  });

  if (!response.ok) {
    throw new Error(JSON.stringify(await response.json()));
  }
  return await response.json();
};

export const EditBlog = async (
  blogId,
  title,
  author,
  text,
  blogImage
) => {
  const Token = localStorage.getItem("authToken");
  const formData = new FormData();
  formData.append("title", title);
  formData.append("author", author);
  formData.append("content", text);
  if (blogImage) {
    formData.append("image", blogImage);
  }

  const response = await fetch(`${API_URL}/blogs/${blogId}/`, {
    method: "PATCH",
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