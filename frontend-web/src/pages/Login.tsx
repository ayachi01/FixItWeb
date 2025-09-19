import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

// ✅ Functions (runtime)
import { saveTokens, saveProfile } from "../utils/auth";

// ✅ Type (compile-time only)
import type { UserProfile } from "../utils/auth";

interface TokenResponse {
  access: string;
  refresh: string;
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // 🔹 Step 1: Request JWT tokens
      const response = await fetch("http://127.0.0.1:8000/api/token/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data: TokenResponse | any = await response.json();

      if (!response.ok) {
        let message = "Login failed";
        if (data.detail) {
          message = data.detail;
        } else if (data.username) {
          message = data.username.join(", ");
        } else if (typeof data === "object") {
          const firstKey = Object.keys(data)[0];
          message = Array.isArray(data[firstKey])
            ? data[firstKey][0]
            : JSON.stringify(data);
        }
        throw new Error(message);
      }

      // 🔹 Save tokens (with utils)
      saveTokens(data as TokenResponse);

      // 🔹 Step 2: Fetch user profile
      const profileRes = await fetch("http://127.0.0.1:8000/api/profile/", {
        headers: {
          Authorization: `Bearer ${data.access}`,
        },
      });

      if (!profileRes.ok) {
        throw new Error("Failed to fetch profile");
      }

      const profile: UserProfile = await profileRes.json();
      saveProfile(profile);

      // 🔹 Step 3: Redirect to dashboard
      navigate("/dashboard");
    } catch (error: unknown) {
      if (error instanceof Error) {
        alert(error.message);
        console.error(error);
      } else {
        alert("Login failed. Please check your email/password.");
      }
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-2xl shadow-md w-96"
      >
        <h2 className="text-2xl font-bold mb-4 text-center">Login</h2>

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
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
        >
          Login
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

export default Login;
