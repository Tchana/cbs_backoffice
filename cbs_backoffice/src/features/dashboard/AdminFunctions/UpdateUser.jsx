import "../dashboard.css";
import { useState } from "react";
import { editUser } from "../../../services/apiservice";
import { Users } from "../../../services/apiservice";
import { useNavigate } from "react-router-dom";

export const User_validation = () => {
    const navigate = useNavigate()
    const [email, setEmail] = useState('');


    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let infoToBeUpdated = []
            const initialData = await Users();
            initialData.forEach(element => {
                if (element.email == email) {
                    infoToBeUpdated.push(element)
                }
            });
            if (infoToBeUpdated.length === 0) {
                throw new Error("This email address does not exist");
            }
            localStorage.setItem("InfoToBeUpdated", JSON.stringify(infoToBeUpdated))
            navigate("/dashboard/Update_User")

        } catch (error) {
            console.error('Error getting the email address:', error);
        }

    };

    return (
        <div className="login-page">
            <h2>Update User</h2>
            <p><b>Enter the email address of the user you want to edit</b></p>
            <form onSubmit={handleSubmit} encType="multipart/form-data">
                <div className="form-group">
                    <label htmlFor="email">email:</label>
                    <input
                        type="text"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required />
                </div>
                <button type="submit">Submit</button>
            </form>
        </div>
    )
}


export const UpdateUser = () => {
    const infoToBeUpdated = JSON.parse(localStorage.getItem("InfoToBeUpdated"))
    const [role, setRole] = useState(infoToBeUpdated[0].role);
    const [email, setEmail] = useState(infoToBeUpdated[0].email);
    const [firstname, setFirstname] = useState(infoToBeUpdated[0].firstname);
    const [lastname, setLastname] = useState(infoToBeUpdated[0].lastname);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const updatedUser = await editUser(infoToBeUpdated[0].id,
                email || infoToBeUpdated[0].email,
                firstname || infoToBeUpdated[0].firstname,
                lastname || infoToBeUpdated[0].lastname,
                role
            )
            console.log(updatedUser)
        } catch (error) {
            console.error("Error Updating user: ", error)
        }
    }

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
                <div className="form-group">
                    <label htmlFor="role">Role:</label>
                    <select
                        id="role"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                    >
                        <option value={infoToBeUpdated.role === "student" ? "student" : "teacher"}>{infoToBeUpdated.role === "Student" ? "Student" : "Teacher"}</option>
                        <option value={infoToBeUpdated.role != "student" ? "student" : "teacher"}>{infoToBeUpdated.role != "Student" ? "Student" : "Teacher"}</option>
                    </select>
                </div>
                <button type="submit">Submit</button>
            </form>
        </div>
    );
}