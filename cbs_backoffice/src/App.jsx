import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import LoginPage from "./features/authentication/login/login.jsx";
import SignUp from "./features/authentication/signup/Signup.jsx";
import Dashboard from "./features/dashboard/dashboard.jsx";
import User_table from "./features/dashboard/Tables/User_table.jsx";
import Lesson_table from './features/dashboard/Tables/Lesson_table.jsx';
import Course_table from './features/dashboard/Tables/Course_table.jsx';

function Paths(){
    return (<Router>
        <Routes>
            <Route path="/" element={<Navbar />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/User_table" element={<User_table />} />
            <Route path='/dashboard/Course_table' element={<Course_table />} />
            <Route path='/dashboard/Lesson_table' element={<Lesson_table />} />
        </Routes>
    </Router>);
}

function App() {
    return(
        <Paths />
    );
}

export default App;