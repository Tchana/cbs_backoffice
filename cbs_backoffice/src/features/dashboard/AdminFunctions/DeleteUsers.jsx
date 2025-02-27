import "../dashboard"
import { deleteUser } from "../../../services/apiservice"
import { useState } from "react"
import { Users } from "../../../services/apiservice"
export const DeleteUser = () => {
    const [email, setEmail] = useState('')

    const handleSubmit = async (e) =>{
        e.preventDefault();
        try {
                    let id = null
                    const initialData = await Users();
                    initialData.forEach(element => {
                        if (element.email == email) {
                            id = element.id
                        }
                    });
                    if (id === null) {
                        throw new Error("This email address does not exist");
                    }
                    const response = await deleteUser(id)
                    console.log(response)
        
                } catch (error) {
                    console.error('Error getting the email address:', error);
                }
    }

    return (
        <>

            <div className="login-page">
                <h2>Update User</h2>
                <p><b>Enter the email address of the user you want to delete</b></p>
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

        </>
        
    )
}