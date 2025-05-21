const API_URL = "https://mardoche.pythonanywhere.com";

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
