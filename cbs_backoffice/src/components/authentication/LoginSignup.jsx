import React from "react";
import * as Components from "./Components";
import { login } from "../../services/AuthenticationManagement";
import { useNavigate } from "react-router-dom";
import { signup } from "../../services/AuthenticationManagement";

function AuthPage() {
  localStorage.setItem("auth", false);
  const navigate = useNavigate();
  const [signIn, toggle] = React.useState(true);

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [p_image, setP_image] = React.useState(null);
  const [role, setRole] = React.useState("teacher");

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await login(email, password).then((data) => {
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("auth", true);
        navigate("/overview");
      });

      navigate(0);
    } catch (error) {
      console.error("Error logging in:", error);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();

    console.log(firstName);
    try {
      await signup(email, password, firstName, lastName, p_image, role);

      console.log("Signup successful");
      toggle(true);
    } catch (error) {
      console.error("Error Signing up:", error);
    }
  };

  return (
    <Components.Container>
      <Components.SignUpContainer $signIn={signIn}>
        <Components.Form onSubmit={handleSignUp}>
          <Components.Title>Create Account</Components.Title>
          <Components.Input
            type="text"
            id="firstname"
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
          <Components.Input
            type="text"
            id="lastname"
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
          <Components.Input
            type="text"
            id="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Components.Input
            type="password"
            id="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Components.Input
            type="file"
            id="p_image"
            accept="image/*"
            placeholder="Profile Image"
            onChange={(e) => setP_image(e.target.files[0])}
            required
          />
          <Components.Select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
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
          <Components.Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Components.Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
