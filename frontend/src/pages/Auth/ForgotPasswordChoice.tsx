import { useNavigate } from "react-router-dom";

export default function ForgotPasswordChoice() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white shadow-md rounded-2xl p-6 w-full max-w-md text-center">
        <h2 className="text-xl font-bold mb-6">Forgot Password</h2>
        <p className="mb-6 text-gray-600">
          Choose how you want to reset your password:
        </p>

        <button
          onClick={() => navigate("/forgot-password/email")}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 mb-4"
        >
          Reset via Email Link
        </button>

        <button
          onClick={() => navigate("/forgot-password/otp")}
          className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
        >
          Reset via OTP
        </button>

        <p
          className="text-sm text-gray-500 mt-6 cursor-pointer hover:underline"
          onClick={() => navigate("/login")}
        >
          Back to Login
        </p>
      </div>
    </div>
  );
}
