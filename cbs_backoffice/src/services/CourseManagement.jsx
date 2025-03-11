const API_URL = "http://127.0.0.1:8000";

export const CreateCourse = async (
  teacherFirstName,
  teacherlastName,
  title,
  description,
  level
) => {
  const Token = localStorage.getItem("authToken");

  const teacherResponse = await fetch(`${API_URL}/user/teachers`, {
    method: "GET",
    headers: {
      Authorization: `Token ${Token}`,
      "Content-Type": "application/json",
    },
  });

  const teachersData = await teacherResponse.json();

  const teacherData = teachersData.filter(
    (user) =>
      user.firstName === teacherFirstName && user.lastName === teacherlastName
  );
  const teacherId = teacherData[0].uuid;
  const formData = new FormData();
  formData.append("teacher", teacherId);
  formData.append("title", title);
  formData.append("description", description);
  formData.append("level", level);

  const response = await fetch(`${API_URL}/course`, {
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

export const GetCourses = async () => {
  const token = localStorage.getItem("authToken");
  const response = await fetch(`${API_URL}/course`, {
    method: "GET",
    headers: { Authorization: `Token ${token}` },
  });

  if (!response.ok) {
    throw new Error("Could not retrieve the courses");
  }
  const data = await response.json();
  return data || []; // Ensure it's always an array
};

export const editCourse = async (
  id,
  title,
  description,
  level,
  teacherFirstName,
  teacherLastName
) => {
  const token = localStorage.getItem("authToken");

  const teacherResponse = await fetch(`${API_URL}/user/teachers`, {
    method: "GET",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
    },
  });

  const teachersData = await teacherResponse.json();

  const teacherData = teachersData.filter(
    (user) =>
      user.firstName === teacherFirstName && user.lastName === teacherLastName
  );
  const teacherId = teacherData[0].uuid;
  const response = await fetch(`${API_URL}/course/edit/${id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: title,
      description: description,
      level: level,
      teacher: teacherId,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Error editing user: ", errorText);
    throw new Error(errorText);
  }
  return await response.json();
};

export const deleteCourse = async (id) => {
  const Token = localStorage.getItem("authToken");
  const response = await fetch(`${API_URL}/course/delete/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Token ${Token}`,
      "Content-Type": "application/json",
    },
  });
};
