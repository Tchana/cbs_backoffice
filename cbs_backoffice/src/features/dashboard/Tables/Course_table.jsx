import React, { useState, useEffect } from 'react';
import "../dashboard.css";
import { courses } from "../../../services/apiservice";

function Course_table() {
    const [coursesList, setCoursesList] = useState([]);

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const courses_data = await courses();  
                setCoursesList(courses_data);  
            } catch (error) {
                console.error('Error fetching courses:', error);
            }
        };

        fetchCourses();
    }, []);  

    
    return (
        <div id="course-table" className="table-container">
            <p>Course table</p>
            <table>
                <thead>
                    <tr>
                        <th>Course ID</th>
                        <th>Course Name</th>
                    </tr>
                </thead>
                <tbody>
                    {coursesList.map((course) => (
                        <tr key={course.course_id}>
                            <td>{course.course_id}</td>
                            <td>{course.course_name}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default Course_table;
