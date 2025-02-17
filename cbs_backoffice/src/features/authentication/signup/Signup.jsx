import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../login.css'
import { signup } from '../../../services/apiservice';
import { useNavigate } from 'react-router-dom';

function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [p_image, setP_image] = useState(null);
  const [role, setRole] = useState('');

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await signup(email, password, firstname, lastname, p_image, role);
      console.log('Signup successful:', data);
      navigate('/login');
    } catch (error) {
      console.error('Error Signing up in:', error)
    }
  };

  return (
    <div className="login-page">
      <h2>Signup</h2>
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
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="lastname">Last Name:</label>
          <input
            type="text"
            id="lastname"
            value={lastname}
            onChange={(e) => setLastname(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
        <label htmlFor="p_image">Profile Image:</label>
        <input
          type='file'
          id="p_image"
          accept='image/*'
          onChange={(e) => setP_image(e.target.files[0])}
          required
        />
        </div>
        <div className="form-group">
          <label htmlFor="role">Role:</label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            required
          >
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
          </select>
        </div>
        <button type="submit">Sign up</button>
        <p>Don't have an account? <Link to="/login">Login</Link></p>
      </form>
    </div>
  );
}

export default Signup;
