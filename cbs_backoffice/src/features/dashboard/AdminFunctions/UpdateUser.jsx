import "../dashboard.css";
import { useState } from "react";
import { editUser } from "../../../services/apiservice";
import { Link } from "react-router-dom";
import { GetUserbyemail } from "../../../services/apiservice";

function UpdateUser() {

    const [email, setEmail] = useState('');
    const [firstname, setFirstname] = useState('');
    const [lastname, setLastname] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const UserInfo = GetUserbyemail(email);
            console.log(UserInfo)
            const data = await editUser(UserInfo.id,
                email || UserInfo.email,
                firstname || UserInfo.firstname,
                lastname || UserInfo.lastname,
            );
        } catch (error) {
            console.error('Error updating user:', error);
        }
    };


    return (
        <div className="login-page">
            <h2>Update User</h2>
            <p><b><u>NB</u>:</b> If you don't want to update a field, leave it empty</p>
            <form onSubmit={handleSubmit} encType="multipart/form-data">
                <div className="form-group">
                    <label htmlFor="email">email:</label>
                    <input
                        type="text"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="firstname">First Name:</label>
                    <input
                        type="text"
                        id="firstname"
                        value={firstname}
                        onChange={(e) => setFirstname(e.target.value)}
                        
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="lastname">Last Name:</label>
                    <input
                        type="text"
                        id="lastname"
                        value={lastname}
                        onChange={(e) => setLastname(e.target.value)}
                        
                    />
                </div>
                
                <button type="submit">Sign up</button>
                <p>Don't have an account? <Link to="/login">Login</Link></p>
            </form>
        </div>
    );
}

export default UpdateUser;
