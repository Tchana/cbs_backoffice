const API_URL = 'http://127.0.0.1:8000';

export const CreateCourse = async (teacher, title, description, level) => {
    const formData = new FormData();
    formData.append("teacher", teacher);
    formData.append("title", title);
    formData.append("description", description);
    formData.append("level", level);

    const response = await fetch(`${API_URL}/createcourse`, {
        method: "POST",
        body: formData
    });

    if (!response.ok) {
        throw new Error('Your course could not be created');
    }
    return response.json();
};

export const GetCourses = async () => {
    const token = localStorage.getItem("authToken");
    const response = await fetch(`${API_URL}/course`, {
        method: "GET",
        headers: { 'Authorization': `Token ${token}` }
    });

    if (!response.ok) {
        throw new Error('Could not retrieve the courses');
    }
    const data = await response.json();
    console.log("Fetched courses:", data); // Debugging
    return data || []; // Ensure it's always an array
};
