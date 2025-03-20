import { GetCourses } from "./CourseManagement";

const API_URL = "http://127.0.0.1:8000";

export const AddBook = async (
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
