// 📂 src/pages/InviteRegisterPage.tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { CheckCircle, Loader2 } from "lucide-react";
import type { Invite } from "../../api/invite";
import { inviteValidate, registerInvite } from "../../api/invite";

export default function InviteRegisterPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [invite, setInvite] = useState<Invite | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // ------------------------------------------------------
  // ✅ Validate invite token
  // ------------------------------------------------------
  useEffect(() => {
    if (!token) {
      toast.error("Invalid invite link");
      setLoading(false);
      return;
    }

    const fetchInvite = async () => {
      console.log("[DEBUG] Validating invite token:", token);
      try {
        const data = await inviteValidate(token);
        console.log("[DEBUG] Invite data received:", data);
        setInvite(data);
      } catch (err: any) {
        console.error("[DEBUG] Invite validation failed:", err);
        toast.error(
          err.response?.data?.error || "Invalid or expired invite link"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchInvite();
  }, [token]);

  // ------------------------------------------------------
  // ✅ Handle registration
  // ------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submitting) return;

    if (!firstName || !lastName || !password || !confirmPassword) {
      toast.error("All fields are required");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (!invite || !token) {
      toast.error("Invalid or missing invite");
      return;
    }

    setSubmitting(true);
    console.log("[DEBUG] Sending registerInvite request:", {
      token,
      firstName,
      lastName,
      password,
      confirmPassword,
    });

    try {
      const response = await registerInvite(
        token,
        firstName.trim(),
        lastName.trim(),
        password,
        confirmPassword
      );
      console.log("[DEBUG] registerInvite response:", response);

      // ✅ Visual success feedback before redirect
      setSuccess(true);
      toast.success("Account created successfully!");
      setTimeout(() => navigate("/login"), 2200);
    } catch (err: any) {
      console.error("[DEBUG] registerInvite error:", err);
      const errorMessage =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "Registration failed. Please try again.";

      if (
        errorMessage.includes("already registered") ||
        errorMessage.includes("User already exists")
      ) {
        toast.success("Account already registered! Redirecting to login...");
        setTimeout(() => navigate("/login"), 1200);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ------------------------------------------------------
  // ✅ UI States
  // ------------------------------------------------------
  if (loading)
    return (
      <div className="flex flex-col items-center justify-center h-screen text-gray-600 bg-gray-50">
        <Loader2 className="animate-spin w-8 h-8 mb-3 text-blue-600" />
        <p className="text-base">Loading invite...</p>
      </div>
    );

  if (!invite)
    return (
      <div className="flex flex-col items-center justify-center h-screen text-gray-700 bg-gray-50">
        <p className="text-center text-lg text-red-600 font-medium">
          Invalid or expired invite link.
        </p>
        <button
          onClick={() => navigate("/login")}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all"
        >
          Back to Login
        </button>
      </div>
    );

  // ------------------------------------------------------
  // ✅ Registration Form
  // ------------------------------------------------------
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 transition-all relative">
        {success ? (
          <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
            <CheckCircle className="w-16 h-16 text-green-500 mb-4 animate-bounce" />
            <h2 className="text-2xl font-bold mb-2 text-gray-800">
              Registration Successful!
            </h2>
            <p className="text-gray-600">
              Redirecting you to the login page...
            </p>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-4 text-center text-gray-800">
              Join as <span className="text-blue-600">{invite.role.name}</span>
            </h2>

            <div className="mb-6 text-center text-gray-600">
              <p>
                Email: <strong>{invite.email}</strong>
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Complete your registration below to activate your account.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="First Name"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />

              <input
                type="text"
                placeholder="Last Name"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />

              <input
                type="password"
                placeholder="Password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <input
                type="password"
                placeholder="Confirm Password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />

              <button
                type="submit"
                disabled={submitting}
                className={`w-full flex justify-center items-center bg-blue-600 text-white py-2.5 px-4 rounded-lg font-medium shadow-sm transition-all duration-200 ${
                  submitting
                    ? "opacity-60 cursor-not-allowed"
                    : "hover:bg-blue-700 active:scale-[0.98]"
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Registering...
                  </>
                ) : (
                  "Register"
                )}
              </button>
            </form>

            <p className="mt-4 text-sm text-center text-gray-500">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-blue-600 hover:underline"
              >
                Log in
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
