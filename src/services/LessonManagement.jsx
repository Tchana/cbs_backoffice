const API_URL = "http://127.0.0.1:8000/";

export const CreateLesson = async (
  courseId,
  lesosnTitle,
  lessonDescription,
  lessonFile
) => {
  const Token = localStorage.getItem("authToken");

  const formData = new FormData();
  formData.append("course", courseId);
  formData.append("title", lesosnTitle);
  formData.append("description", lessonDescription);
  formData.append("file", lessonFile);

  const response = await fetch(`${API_URL}/lesson`, {
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

export const DeleteLesson = async (lessonId) => {
  const Token = localStorage.getItem("authToken");

  const response = await fetch(`${API_URL}/lesson/del/${lessonId}`, {
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

export const EditLesson = async (lessonId, title, description, file) => {
  const Token = localStorage.getItem("authToken");
  const formData = new FormData();

  if (title) formData.append("title", title);
  if (description) formData.append("description", description);
  if (file) formData.append("file", file);

  const response = await fetch(`${API_URL}/lesson/edit/${lessonId}`, {
    method: "PUT",
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
