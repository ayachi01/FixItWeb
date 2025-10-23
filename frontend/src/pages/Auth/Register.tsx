import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register as apiRegister } from "../../api";

export default function Register() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const emailDomain = email.split("@")[1]?.toLowerCase();
    if (emailDomain !== "phinmaed.com") {
      setError("Only phinmaed.com email addresses are allowed.");
      return;
    }

    setLoading(true);
    try {
      await apiRegister(firstName, lastName, email, password, confirmPassword);
      setSuccessMessage(
        "🎉 Registration successful! Please check your email to verify your account."
      );

      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");

      setTimeout(() => navigate("/login"), 2000);
    } catch (err: any) {
      const backendData = err.response?.data;
      setError(
        backendData?.error ||
        backendData?.password?.[0] ||
        backendData?.email?.[0] ||
        backendData?.first_name?.[0] ||
        backendData?.last_name?.[0] ||
        "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-[#F8F8F8] overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-green-100/40 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-green-100/40 rounded-full blur-3xl"></div>
      </div>

      {/* Register card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-200">
          {/* Logo */}
          <div className="text-center mb-8">
            <img
              src="/src/assets/fixit_logo.png"
              alt="FixIt Logo"
              className="w-28 h-28 mx-auto mb-4 object-contain"
            />
            <h2 className="text-3xl font-bold text-gray-800">Create Account</h2>
            <p className="text-gray-500 mt-2">
              Join FixIt and start your journey
            </p>
          </div>

          {/* Error & Success messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-600 text-sm font-medium">{error}</p>
            </div>
          )}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-green-600 text-sm font-medium">
                {successMessage}
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="First Name"
                className="w-1/2 p-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-all placeholder:text-gray-400"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Last Name"
                className="w-1/2 p-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-all placeholder:text-gray-400"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>

            <input
              type="email"
              placeholder="Email (use @pirmaed.com)"
              className="w-full p-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-all placeholder:text-gray-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Password"
              className="w-full p-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-all placeholder:text-gray-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Confirm Password"
              className="w-full p-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-all placeholder:text-gray-400"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-700 text-white py-3.5 rounded-xl font-semibold shadow-md hover:bg-green-800 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Registering..." : "Register"}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">
                Already have an account?
              </span>
            </div>
          </div>

          {/* Login link */}
          <Link
            to="/login"
            className="block w-full py-3.5 text-center font-semibold text-green-700 border border-green-700 rounded-xl hover:bg-green-50 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            Login
          </Link>
        </div>

        {/* Footer text */}
        <p className="text-center text-gray-400 text-sm mt-6">
          FixIt — secure and reliable registration
        </p>
      </div>
    </div>
  );
}
