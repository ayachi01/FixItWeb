import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import type { User } from "../../store/authStore";

export default function Login() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [localError, setLocalError] = useState<string>("");
  const navigate = useNavigate();
  const { login, loading, error } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(""); // clear previous error

    try {
      await login(email, password);

      // ✅ Check if user exists in store and has verified email
      const currentUser: User | null = useAuthStore.getState().user;
      if (currentUser) {
        if (!currentUser.is_email_verified) {
          setLocalError("Please verify your email before logging in.");
          return;
        }
        navigate("/dashboard"); // redirect to dashboard
      }
    } catch (err: any) {
      console.error(err);
      // Attempt to read server error, fallback to generic message
      setLocalError(
        err.response?.data?.error || "Login failed. Please try again."
      );
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-2xl shadow-md w-96"
      >
        <h2 className="text-xl font-bold mb-4">Login</h2>

        {(error || localError) && (
          <p className="text-red-500 mb-3">{error || localError}</p>
        )}

        <input
          type="email"
          placeholder="Email"
          className="w-full p-2 border rounded mb-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full p-2 border rounded mb-3"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 mb-3"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <div className="flex justify-between text-sm mb-3">
          <Link to="/forgot-password" className="text-blue-500 hover:underline">
            Forgot Password?
          </Link>
          <Link to="/register" className="text-blue-500 hover:underline">
            Sign Up
          </Link>
        </div>
      </form>
    </div>
  );
}
