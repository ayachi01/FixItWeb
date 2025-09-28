// src/pages/ForgotPassword.tsx
import { useState } from "react";
import { api } from "../api/client"; // Make sure this points to your axios instance

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      const res = await api.post("/auth/forgot-password/", { email });

      if (res.status === 200) {
        setMessage("If this email exists, a reset link has been sent.");
      } else {
        setError(res.data.error || "Failed to send reset email");
      }
    } catch (err: any) {
      console.error("❌ Forgot password error:", err);

      if (err.response) {
        setError(
          err.response.data?.error ||
            `Failed to send reset email. Status: ${err.response.status}`
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
        <h2 className="text-xl font-bold mb-4">Forgot Password</h2>

        {message && <p className="text-green-500 mb-3">{message}</p>}
        {error && <p className="text-red-500 mb-3">{error}</p>}

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
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          Send Reset Link
        </button>
      </form>
    </div>
  );
}
