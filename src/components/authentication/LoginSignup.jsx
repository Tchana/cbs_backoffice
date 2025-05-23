import React, { useState } from "react";
import * as Components from "./Components";
import { login, signup } from "../../services/AuthenticationManagement";
import { useNavigate } from "react-router-dom";
import { GetUsers } from "../../services/UsersManagement";

function AuthPage() {
  const navigate = useNavigate();
  const [signIn, toggle] = useState(true);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    p_image: null,
    role: "teacher",
  });

  const clearForm = () => {
    setFormData({
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      p_image: null,
      role: "teacher",
    });
    setError("");
    setSuccessMessage("");
    setShowPassword(false);
  };

  const handleToggle = () => {
    clearForm();
    toggle(!signIn);
  };

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

      if (data.role === "student") {
        throw new Error("Student account not allowed");
      }

      localStorage.setItem("authToken", data.token);
      localStorage.setItem("auth", "true");
      localStorage.setItem("role", JSON.stringify(data.role));

      const userData = await GetUsers();
      const user = userData.find((user) => user.email === formData.email);
      if (user.role === "student") {
        localStorage.setItem("auth", "false");
        localStorage.removeItem("authToken");
        throw new Error("Student account not allowed");
      }
      localStorage.setItem("role", JSON.stringify(user.role));
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
    setSuccessMessage("");

    try {
      // Register the user
      await signup(
        formData.email,
        formData.password,
        formData.firstName,
        formData.lastName,
        formData.p_image,
        formData.role
      );

      // Show approval message for teacher roles
      if (formData.role === "teacher") {
        setShowApprovalModal(true);
      } else {
        // For students, show regular success message
        setSuccessMessage("Account created successfully! Please login.");
      }
      
      // Clear form data
      clearForm();

      // Switch to login form
      toggle(true);
    } catch (error) {
      console.error("Error during signup:", error);
      setError("Failed to create account. Please try again.");
    }
  };

  return (
    <>
      <Components.Container>
        <Components.SignUpContainer $signIn={signIn}>
          <Components.Form onSubmit={handleSignUp}>
            <Components.Title>Create Account</Components.Title>
            {error && <div className="text-red-500 mb-4">{error}</div>}
            {successMessage && <div className="text-green-500 mb-4">{successMessage}</div>}
            <Components.Input
              type="text"
              id="firstName"
              placeholder="First Name"
              value={formData.firstName}
              onChange={handleInputChange}
              required
              className="w-full h-12 px-4"
            />
            <Components.Input
              type="text"
              id="lastName"
              placeholder="Last Name"
              value={formData.lastName}
              onChange={handleInputChange}
              required
              className="w-full h-12 px-4"
            />
            <Components.Input
              type="email"
              id="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleInputChange}
              required
              className="w-full h-12 px-4"
            />
            <div className="relative w-full">
              <Components.Input
                type={showPassword ? "text" : "password"}
                id="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleInputChange}
                required
                className="w-full h-12 px-4"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
            <Components.Input
              type="file"
              id="p_image"
              accept="image/*"
              placeholder="Profile Image"
              onChange={handleInputChange}
              required
              className="w-full h-12 px-4"
            />
            <Components.Select
              id="role"
              value={formData.role}
              onChange={handleInputChange}
              required
              className="w-full h-12 px-4"
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
              className="w-full h-12 px-4"
            />
            <div className="relative w-full">
              <Components.Input
                type={showPassword ? "text" : "password"}
                id="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full h-12 px-4"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
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
              <Components.GhostButton onClick={handleToggle}>
                Login
              </Components.GhostButton>
            </Components.LeftOverlayPanel>

            <Components.RightOverlayPanel $signIn={signIn}>
              <Components.Title>Welcome Back!</Components.Title>
              <Components.Paragraph>
                To keep connected with us please login with your personal info
              </Components.Paragraph>
              {/* <Components.GhostButton onClick={handleToggle}>
                Sign Up
              </Components.GhostButton> */}
            </Components.RightOverlayPanel>
          </Components.Overlay>
        </Components.OverlayContainer>
      </Components.Container>

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Account Creation Request Submitted</h2>
            <p className="text-gray-600 mb-6">
              Your account creation request has been initiated. You'll get a response when your account creation will be validated.
            </p>
            <button
              onClick={() => setShowApprovalModal(false)}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default AuthPage;
