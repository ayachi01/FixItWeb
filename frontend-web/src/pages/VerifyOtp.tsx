// src/pages/VerifyOtp.tsx
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAPI } from "../api/API";

export default function VerifyOtp() {
  const API = useAPI();
  const location = useLocation();
  const email = (location.state as { email: string })?.email || "";
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await API.post("/users/verify_otp/", { email, otp });
      setMessage(res.data.message || "Email verified successfully!");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err: any) {
      setMessage(
        err.response?.data?.error || "Invalid or expired OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      const res = await API.post("/users/resend_otp/", { email });
      setMessage(res.data.message || "A new OTP has been sent to your email.");
    } catch (err: any) {
      setMessage(
        err.response?.data?.error || "Failed to resend OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <form
        onSubmit={handleVerify}
        className="bg-white p-8 rounded-2xl shadow-md w-96"
      >
        <h2 className="text-2xl font-bold mb-6 text-center">Verify OTP</h2>
        {message && (
          <p
            className={`mb-4 text-center ${
              message.toLowerCase().includes("success")
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {message}
          </p>
        )}

        <input
          type="text"
          placeholder="Enter OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          className="w-full border p-2 rounded mb-4"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className={`w-full bg-purple-600 text-white p-2 rounded hover:bg-purple-700 ${
            loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {loading ? "Verifying..." : "Verify"}
        </button>

        <button
          type="button"
          onClick={handleResendOtp}
          disabled={loading}
          className={`w-full mt-3 bg-gray-500 text-white p-2 rounded hover:bg-gray-600 ${
            loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {loading ? "Resending..." : "Resend OTP"}
        </button>
      </form>
    </div>
  );
}
