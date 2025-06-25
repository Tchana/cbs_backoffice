const API_URL = "http://127.0.0.1:8000/";

export const WhoAmI = async () => {
  const response = await fetch(`${API_URL}/user/me`, {
    headers: {
      Authorization: `Token ${localStorage.getItem("authToken")}`,
    },
  });
  if (!response.ok) {
    throw new Error("Failed to fetch account info");
  }
  const data = await response.json();
  return data;
};
