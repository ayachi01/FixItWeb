// src/pages/VerifyEmailPage.tsx
import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client"; // ✅ use your Axios instance

export default function VerifyEmailPage() {
  const { uidb64, token } = useParams<{ uidb64: string; token: string }>();
  const [message, setMessage] = useState("Verifying...");
  const [error, setError] = useState("");
  const hasRun = useRef(false); // 🔹 prevents duplicate requests in StrictMode

  useEffect(() => {
    if (hasRun.current) return; // ✅ block second execution
    hasRun.current = true;

    async function verify() {
      console.log("🔹 Starting email verification...");
      console.log("Params received:", { uidb64, token });

      if (!uidb64 || !token) {
        console.error("❌ Missing UID or token!");
        setError("Invalid verification link.");
        setMessage("");
        return;
      }

      try {
        const url = `/auth/verify-email/${uidb64}/${token}/`;
        console.log("🔹 Full GET request URL:", url);

        const response = await api.get(url);
        console.log("✅ Response from backend:", response.data);

        if (response.data?.message) {
          setMessage("🎉 Email verified successfully! You can now log in.");
          setError("");
        } else if (response.data?.error) {
          setError(response.data.error);
          setMessage("");
        } else {
          setMessage("🎉 Email verified! You can now log in.");
          setError("");
        }
      } catch (err: any) {
        console.error("❌ Error during email verification:", err);

        if (err.response) {
          console.error("🔹 Backend returned status:", err.response.status);
          console.error("🔹 Backend response data:", err.response.data);
          setError(
            err.response.data?.error ||
              `Email verification failed. Status code: ${err.response.status}`
          );
        } else if (err.request) {
          console.error("🔹 No response received from backend:", err.request);
          setError("No response from server. Check your backend.");
        } else {
          console.error("🔹 Axios setup error:", err.message);
          setError(`Error: ${err.message}`);
        }

        setMessage("");
      }
    }

    verify();
  }, [uidb64, token]);

  console.log("🔹 Current state:", { message, error });

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="bg-white p-6 rounded-2xl shadow-md w-96 text-center">
        {error ? (
          <p className="text-red-500 mb-4">{error}</p>
        ) : (
          <p className="text-green-500 mb-4">{message}</p>
        )}

        <Link to="/login" className="text-blue-500 hover:underline font-medium">
          Back to Login
        </Link>
      </div>
    </div>
  );
}
