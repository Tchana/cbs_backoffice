import './dashboard.css';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
    const [menuOpen, setMenuOpen] = useState(false);
    const navigate = useNavigate();
    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
    };

    return (
        <>
            <button className="btn btn-primary" onClick={toggleMenu}>
                Menu
            </button>
            <div className={`menu-bar ${menuOpen ? 'open' : ''}`}>
                <ul>
                    <li><button onClick={() => navigate("/dashboard/User_table")}>User Table</button></li>
                    <li><button onClick={() => navigate("/dashboard/Course_table")}>Course Table</button></li>
                    <li><button onClick={() => navigate("/dashboard/Lesson_table")}>Lesson Table</button></li>
                </ul>
            </div>
        </>
    )
}

export default Dashboard;