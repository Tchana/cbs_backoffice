import { GetCourses } from "./CourseManagement";

const API_URL = "http://127.0.0.1:8000";

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
