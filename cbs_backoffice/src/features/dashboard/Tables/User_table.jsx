import React, { useState, useEffect } from 'react';
import "../dashboard.css";
import { Users } from "../../../services/apiservice";


function User_table(){
   const [UserList, setUserList] = useState([]);
   
       useEffect(() => {
           const fetchUsers = async () => {
               try {
                   const Users_data = await Users();
                   setUserList(Users_data);
               } catch (error) {
                   console.error('Error fetching courses:', error);
               }
           };
   
           fetchUsers();
       }, []);
   
   
       return (
           <div id="lesson-table" className="table-container">
               <p>User table</p>
               <table>
                   <thead>
                       <tr>
                           <th>id</th>
                           <th>First Name</th>
                           <th>Last Name</th>
                           <th>email</th>
                       </tr>
                   </thead>
                   <tbody>
                       {UserList.map((user) => (
                           <tr key={user.id}>
                               <td>{user.id}</td>
                               <td>{user.firstname}</td>
                               <td>{user.lastname}</td>
                               <td>{user.email}</td>
                           </tr>
                       ))}
                   </tbody>
               </table>
           </div>
       );
}

export default User_table;