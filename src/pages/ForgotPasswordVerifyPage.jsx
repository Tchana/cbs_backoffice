import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useApiLoader } from "../contexts/ApiLoaderContext";
import {
  resetPasswordWithOtp,
  verifyPasswordResetOtp,
} from "../services/AuthenticationManagement";
import * as Components from "../components/authentication/Components";

const ForgotPasswordVerifyPage = () => {
  const navigate = useNavigate();
  const runWithLoader = useApiLoader().runWithLoader;
  const [searchParams] = useSearchParams();
  const emailFromQuery = useMemo(() => searchParams.get("email") || "", [searchParams]);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!emailFromQuery) {
      setError("Missing email. Start again from forgot password page.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      await runWithLoader(() => verifyPasswordResetOtp(emailFromQuery, otp));
      await runWithLoader(() => resetPasswordWithOtp(newPassword));
      setSuccessMessage("Password reset successful. You can now log in.");
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setError(err.message || "Failed to verify OTP");
    }
  };

  return (
    <Components.Container>
      <Components.SignInContainer $signIn>
        <Components.Form onSubmit={handleSubmit}>
          <Components.Title>Verify OTP</Components.Title>
          <p className="text-sm text-gray-600 mb-2 text-center">
            Enter the OTP sent to <strong>{emailFromQuery || "your email"}</strong>
          </p>
          {error && <div className="text-red-500 mb-4">{error}</div>}
          {successMessage && <div className="text-green-500 mb-4">{successMessage}</div>}
          <Components.Input
            type="text"
            placeholder="OTP code"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="w-full h-12 px-4"
            required
          />
          <Components.Input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full h-12 px-4"
            required
          />
          <Components.Input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full h-12 px-4"
            required
          />
          <Components.Button type="submit">Reset Password</Components.Button>
          <Components.Anchor href="#" onClick={() => navigate("/forgot-password")}>
            Back
          </Components.Anchor>
        </Components.Form>
      </Components.SignInContainer>
    </Components.Container>
  );
};

export default ForgotPasswordVerifyPage;
