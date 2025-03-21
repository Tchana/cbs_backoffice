import React, { useState } from "react";
import * as Components from "./Components";
import { login, signup } from "../../services/AuthenticationManagement";
import { useNavigate } from "react-router-dom";

function AuthPage() {
  const navigate = useNavigate();
  const [signIn, toggle] = useState(true);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    p_image: null,
    role: "teacher",
  });

  const handleInputChange = (e) => {
    const { id, value, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: files ? files[0] : value,
    }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const data = await login(formData.email, formData.password);
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("auth", "true");
      navigate("/overview");
      navigate(0); // Refresh to apply new auth state
    } catch (error) {
      console.error("Error logging in:", error);
      setError("Invalid email or password");
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");

    try {
      // First register the user
      await signup(
        formData.email,
        formData.password,
        formData.firstName,
        formData.lastName,
        formData.p_image,
        formData.role
      );

      // Then automatically log them in
      const loginData = await login(formData.email, formData.password);
      localStorage.setItem("authToken", loginData.token);
      localStorage.setItem("auth", "true");
      navigate("/overview");
      navigate(0); // Refresh to apply new auth state
    } catch (error) {
      console.error("Error during signup:", error);
      setError("Failed to create account. Please try again.");
    }
  };

  return (
    <Components.Container>
      <Components.SignUpContainer $signIn={signIn}>
        <Components.Form onSubmit={handleSignUp}>
          <Components.Title>Create Account</Components.Title>
          {error && <div className="text-red-500 mb-4">{error}</div>}
          <Components.Input
            type="text"
            id="firstName"
            placeholder="First Name"
            value={formData.firstName}
            onChange={handleInputChange}
            required
          />
          <Components.Input
            type="text"
            id="lastName"
            placeholder="Last Name"
            value={formData.lastName}
            onChange={handleInputChange}
            required
          />
          <Components.Input
            type="email"
            id="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleInputChange}
            required
          />
          <Components.Input
            type="password"
            id="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleInputChange}
            required
          />
          <Components.Input
            type="file"
            id="p_image"
            accept="image/*"
            placeholder="Profile Image"
            onChange={handleInputChange}
            required
          />
          <Components.Select
            id="role"
            value={formData.role}
            onChange={handleInputChange}
            required
          >
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
          </Components.Select>
          <Components.Button type="submit">Sign Up</Components.Button>
        </Components.Form>
      </Components.SignUpContainer>

      <Components.SignInContainer $signIn={signIn}>
        <Components.Form onSubmit={handleLogin}>
          <Components.Title>Login</Components.Title>
          {error && <div className="text-red-500 mb-4">{error}</div>}
          <Components.Input
            type="email"
            id="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleInputChange}
          />
          <Components.Input
            type="password"
            id="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleInputChange}
          />
          <Components.Anchor href="#">Forgot your password?</Components.Anchor>
          <Components.Button type="submit">Login</Components.Button>
        </Components.Form>
      </Components.SignInContainer>

      <Components.OverlayContainer $signIn={signIn}>
        <Components.Overlay $signIn={signIn}>
          <Components.LeftOverlayPanel $signIn={signIn}>
            <Components.Title>Hello, Friend!</Components.Title>
            <Components.Paragraph>
              Enter Your personal details and start journey with us
            </Components.Paragraph>
            <Components.GhostButton onClick={() => toggle(true)}>
              Login
            </Components.GhostButton>
          </Components.LeftOverlayPanel>

          <Components.RightOverlayPanel $signIn={signIn}>
            <Components.Title>Welcome Back!</Components.Title>
            <Components.Paragraph>
              To keep connected with us please login with your personal info
            </Components.Paragraph>
            <Components.GhostButton onClick={() => toggle(false)}>
              Sign Up
            </Components.GhostButton>
          </Components.RightOverlayPanel>
        </Components.Overlay>
      </Components.OverlayContainer>
    </Components.Container>
  );
}

export default AuthPage;
