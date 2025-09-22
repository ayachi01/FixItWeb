// src/pages/Login.tsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { saveAccessToken, fetchProfileAndSave } from "../utils/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/token/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // ✅ receive HttpOnly refresh cookie
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.error || "Invalid credentials");
      }

      if (!data.access) {
        throw new Error("No access token received");
      }

      // ✅ Save access token locally
      saveAccessToken(data.access);

      // ✅ Store in context (for components using useAuth)
      await login(data.access);

      // ✅ Try to fetch & save profile before navigating
      try {
        await fetchProfileAndSave();
      } catch (profileErr) {
        console.error("Failed to fetch profile:", profileErr);
        // still allow navigation
      }

      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-2xl shadow-md w-96"
      >
        <h2 className="text-2xl font-bold mb-4 text-center">Login</h2>

        {error && (
          <p className="text-red-600 text-sm text-center mb-3">{error}</p>
        )}

        <input
          type="email"
          placeholder="University Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 border rounded mb-3"
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 border rounded mb-3"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className={`w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition-colors ${
            loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="mt-4 text-center text-sm text-gray-600">
          Don’t have an account?{" "}
          <Link to="/register" className="text-blue-600 hover:underline">
            Create one
          </Link>
        </p>

        <p className="mt-2 text-center text-sm text-gray-600">
          Or{" "}
          <Link to="/guest-report" className="text-blue-600 hover:underline">
            Report as Guest
          </Link>
        </p>
      </form>
    </div>
  );
}
