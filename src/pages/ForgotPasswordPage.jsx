import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApiLoader } from "../contexts/ApiLoaderContext";
import {
  sendPasswordResetOtp,
  validateAdminEmailForReset,
} from "../services/AuthenticationManagement";
import * as Components from "../components/authentication/Components";

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const runWithLoader = useApiLoader().runWithLoader;
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await runWithLoader(() => validateAdminEmailForReset(email));
      await runWithLoader(() => sendPasswordResetOtp(email));
      navigate(`/forgot-password/verify?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(err.message || "Unable to continue password reset");
    }
  };

  return (
    <Components.Container>
      <Components.SignInContainer $signIn>
        <Components.Form onSubmit={handleSubmit}>
          <Components.Title>Forgot Password</Components.Title>
          {error && <div className="text-red-500 mb-4">{error}</div>}
          <Components.Input
            type="email"
            id="email"
            placeholder="Admin email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-12 px-4"
            required
          />
          <Components.Button type="submit">Send OTP</Components.Button>
          <Components.Anchor href="#" onClick={() => navigate("/login")}>
            Back to login
          </Components.Anchor>
        </Components.Form>
      </Components.SignInContainer>

      <Components.OverlayContainer $signIn>
        <Components.Overlay $signIn>
          <Components.RightOverlayPanel $signIn>
            <Components.Title>Reset Password</Components.Title>
            <Components.Paragraph>
              Enter your admin email to receive a one-time verification code.
            </Components.Paragraph>
          </Components.RightOverlayPanel>
        </Components.Overlay>
      </Components.OverlayContainer>
    </Components.Container>
  );
};

export default ForgotPasswordPage;
