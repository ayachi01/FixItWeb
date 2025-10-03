// src/pages/ForgotPasswordOTP.tsx
import { useState } from "react";
import { api } from "../../api/client"; // ✅ axios instance
import { useNavigate } from "react-router-dom";

export default function ForgotPasswordOTP() {
  const [step, setStep] = useState<"request" | "verify">("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // 🔹 Step 1: Request OTP
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await api.post("/users/reset_password_request/", { email });
      if (res.status === 200) {
        setMessage("✅ OTP sent to your email.");
        setStep("verify");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Step 2: Verify OTP + Reset password
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const res = await api.post("/users/reset_password_confirm/", {
        email,
        code: otp,
        new_password: password,
      });
      if (res.status === 200) {
        setMessage("🎉 Password reset successful! Redirecting to login...");
        setTimeout(() => navigate("/login"), 2000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Invalid OTP or request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form
        onSubmit={step === "request" ? handleRequestOtp : handleVerifyOtp}
        className="bg-white shadow-md rounded-2xl p-6 w-full max-w-md"
      >
        <h2 className="text-xl font-bold mb-4">
          {step === "request" ? "Request OTP" : "Verify OTP & Reset Password"}
        </h2>

        {message && <p className="text-green-600 mb-3">{message}</p>}
        {error && <p className="text-red-600 mb-3">{error}</p>}

        {step === "request" && (
          <>
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full p-2 border rounded mb-3"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={loading}
              className={`w-full text-white py-2 rounded ${
                loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </>
        )}

        {step === "verify" && (
          <>
            <input
              type="text"
              placeholder="Enter OTP"
              className="w-full p-2 border rounded mb-3"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="New Password"
              className="w-full p-2 border rounded mb-3"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Confirm Password"
              className="w-full p-2 border rounded mb-3"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <button
              type="submit"
              disabled={loading}
              className={`w-full text-white py-2 rounded ${
                loading ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>

            {/* 🔹 Resend OTP option */}
            <p
              className="text-sm text-blue-600 mt-3 cursor-pointer hover:underline text-center"
              onClick={() => handleRequestOtp()}
            >
              Resend OTP
            </p>
          </>
        )}

        <p
          className="text-sm text-gray-500 mt-4 text-center cursor-pointer hover:underline"
          onClick={() => navigate("/login")}
        >
          Back to Login
        </p>
      </form>
    </div>
  );
}
