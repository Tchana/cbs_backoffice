const API_URL = 'http://127.0.0.1:8000';

export const login = async (username, password) => {
    const response = await fetch(`${API_URL}/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',  
        
      },
      body: JSON.stringify({ 
        "email":username, 
        "password": password }),
      
    });
    if (!response.ok) {
      throw new Error('Invalid username or password');
    }
    const data = await response.json();

    // Store token in local storage
    localStorage.setItem('authToken', data.token);
    
    return data;
};

export const signup = async (email, password, firstname, lastname, p_image, role) => {

  const formData = new FormData();
  formData.append("email", email);
  formData.append("password", password);
  formData.append("firstname", firstname);
  formData.append("lastname", lastname);
  formData.append("p_image", p_image);
  formData.append("role", role);

  const response = await fetch(`${API_URL}/register/`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Signup error: ", errorText)
    throw new Error(errorText);
  }
  const data = await response.json();
  console.log(data);  
  return data;
}

export const courses = async() => {
const token = localStorage.getItem('authToken');
  const response = await fetch(`${API_URL}/getcourse/`, {
    method: 'GET', 
    headers:{
      'Content-type': 'application/json',
      'Authorization': `Token ${token}`
    }
  });

  if (!response.ok){
    const errorText = await response.text();
    console.error("Error getting courses: ", errorText)
    throw new Error(errorText);
  }
  const data = await response.json();
  return data["courses"];
};

export const lessons = async (token) => {
  const response = await fetch(`${API_URL}/getlesson/`, {
    method: 'GET',
    headers: {
      'Content-type': 'application/json',
      'Authorization': `Token ${token}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Error getting lesson: ", errorText)
    throw new Error(errorText);
  }
  const data = await response.json();
  return data;
};

export const Users = async () => {
  const response = await fetch(`${API_URL}/user`, {
    method: 'GET'
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Error getting lesson: ", errorText)
    throw new Error(errorText);
  }
  const data = await response.json();
  return data["users"];

}