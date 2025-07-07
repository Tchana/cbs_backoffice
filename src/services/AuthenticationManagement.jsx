const API_URL = "https://mardoche.pythonanywhere.com";

export const login = async (email, password) => {
  const response = await fetch(`${API_URL}/login/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: email,
      password: password,
    }),
  });
  console.log(response);
  if (!response.ok) {
    console.log(response);
    throw new Error("Invalid username or password");
  }
  const data = await response.json();

  return data;
};

export const signup = async (
  email,
  password,
  firstname,
  lastname,
  p_image,
  role
) => {
  const formData = new FormData();

  formData.append("email", email);
  formData.append("password", password);
  formData.append("firstName", firstname);
  formData.append("lastName", lastname);
  formData.append("pImage", p_image);
  formData.append("role", role);

  try {
    const response = await fetch(`${API_URL}/register/`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Signup error: ", errorText);
      throw new Error(errorText);
    }

    const data = await response.json();
    console.log("Signup success:", data);
    return data;
  } catch (error) {
    console.error("Error signing up:", error);
    throw error;
  }
};

export const updatePassword = async (email, password) => {
  const response = await fetch(`${API_URL}/update-password/`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
};
