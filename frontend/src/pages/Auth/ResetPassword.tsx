// src/pages/ResetPassword.tsx
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../api/client"; // your Axios instance

export default function ResetPassword() {
  const { uidb64, token } = useParams<{ uidb64: string; token: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!uidb64 || !token) {
      setError("Invalid reset link");
      return;
    }

    try {
      const res = await api.post(`/auth/reset-password/${uidb64}/${token}/`, {
        password,
      });

      if (res.status === 200) {
        setMessage("Password reset successful! Redirecting to login...");
        setTimeout(() => navigate("/login"), 2000);
      } else {
        setError(res.data.error || "Failed to reset password");
      }
    } catch (err: any) {
      console.error("❌ Reset password error:", err);

      if (err.response) {
        setError(
          err.response.data?.error ||
            `Failed to reset password. Status: ${err.response.status}`
        );
      } else {
        setError("Something went wrong. Check your connection.");
      }
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-2xl shadow-md w-96"
      >
        <h2 className="text-xl font-bold mb-4">Reset Password</h2>

        {message && <p className="text-green-500 mb-3">{message}</p>}
        {error && <p className="text-red-500 mb-3">{error}</p>}

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
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          Reset Password
        </button>
      </form>
    </div>
  );
}
