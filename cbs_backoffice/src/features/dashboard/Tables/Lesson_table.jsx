import React, { useState, useEffect } from 'react';
import "../dashboard.css";
import { lessons } from "../../../services/apiservice";

function Lesson_table() {
    
    const [lessonsList, setLessonList] = useState([]);

    useEffect(() => {
        const fetchLessons = async () => {
            const token = localStorage.getItem('authToken');

            if(!token) {
                console.error('No token found');
                return;
            }
            try {
                const lessons_data = await lessons(token);
                setLessonList(lessons_data);
            } catch (error) {
                console.error('Error fetching courses:', error);
            }
        };

        fetchLessons();
    }, []);


    return (
        <div id="lesson-table" className="table-container">
            <p>Lesson table</p>
            <table>
                <thead>
                    <tr>
                        <th>Teacher</th>
                        <th>Course ID</th>
                        <th>Course Name</th>
                    </tr>
                </thead>
                <tbody>
                    {lessonsList.map((lesson) => (
                        <tr key={lesson.uuid}>
                            <td>{lesson.uuid}</td>
                            <td>{lesson.title}</td>
                            <td>{lesson.description}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default Lesson_table;
