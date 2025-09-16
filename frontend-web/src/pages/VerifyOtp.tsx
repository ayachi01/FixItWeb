import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API from "../api";

export default function VerifyOtp() {
  const location = useLocation();
  const email = (location.state as { email: string })?.email || "";
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await API.post("/student/verify/", {
        email,
        otp,
      });
      setMessage(res.data.message || "Email verified successfully!");
      // Redirect to login after short delay
      setTimeout(() => navigate("/login"), 1500);
    } catch (err: any) {
      if (err.response?.data?.error) {
        setMessage(err.response.data.error);
      } else {
        setMessage("Invalid or expired OTP. Please try again.");
      }
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <form
        onSubmit={handleVerify}
        className="bg-white p-8 rounded-2xl shadow-md w-96"
      >
        <h2 className="text-2xl font-bold mb-6">Verify OTP</h2>
        {message && (
          <p
            className={`mb-4 ${
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
          className="w-full bg-purple-600 text-white p-2 rounded hover:bg-purple-700"
        >
          Verify
        </button>
      </form>
    </div>
  );
}
