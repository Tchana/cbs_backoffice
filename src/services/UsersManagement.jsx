const API_URL = "https://mardoche.pythonanywhere.com";

export const courses = async () => {
  const token = localStorage.getItem("authToken");
  const response = await fetch(`${API_URL}/course/get`, {
    method: "GET",
    headers: {
      "Content-type": "application/json",
      Authorization: `Token ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Error getting courses: ", errorText);
    throw new Error(errorText);
  }
  let course_list = []; // stores courses name and their id
  const data = await response.json();
  for (let i = 0; i < data.length; i++) {
    course_list.push({
      id: data[i]["course_id"],
      name: data[i]["course_name"],
    });
  }
  localStorage.setItem("course_list", JSON.stringify(course_list));
  return data;
};

export const lessons = async (token) => {
  let course_list = JSON.parse(localStorage.getItem("course_list"));
  if (course_list === null) {
    // await courses();
    course_list = JSON.parse(localStorage.getItem("course_list"));
  }
  let data = [];
  for (let i = 0; i < course_list.length; i++) {
    const response = await fetch(`${API_URL}/lesson/get/${course_list[i].id}`, {
      method: "GET",
      headers: {
        "Content-type": "application/json",
        Authorization: `Token ${token}`,
      },
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error getting lesson: ", errorText);
      throw new Error(errorText);
    }
    const lessons = await response.json();
    lessons.lessons.forEach((lesson) => {
      data.push({
        course_name: course_list[i].name,
        uuid: lesson.id,
        title: lesson.title,
        description: lesson.description,
      });
    });
  }

  return data;
};

export const GetUsers = async () => {
  const response = await fetch(`${API_URL}/user`, {
    method: "GET",
    headers: {
      Authorization: `Token ${localStorage.getItem("authToken")}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Error getting lesson: ", errorText);
    throw new Error(errorText);
  }
  const data = await response.json();
  return data;
};

export const editUser = async (id, email, firstname, lastname, role) => {
  const token = localStorage.getItem("authToken");

  const response = await fetch(`${API_URL}/user/edit/${id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: email,
      firstname: firstname,
      lastname: lastname,
      role: role,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Error editing user: ", errorText);
    throw new Error(errorText);
  }
  return await response.json();
};

export const deleteUser = async (id) => {
  const token = localStorage.getItem("authToken");
  const response = await fetch(`${API_URL}/user/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Error deleting user: ", errorText);
    throw new Error(errorText);
  }
  return { success: true };
};
