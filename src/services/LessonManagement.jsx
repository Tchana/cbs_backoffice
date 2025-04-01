const API_URL = "https://mardoche.pythonanywhere.com";

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
