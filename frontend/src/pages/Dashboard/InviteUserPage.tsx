// 📂 src/pages/Admin/InviteUserPage.tsx
import { useState, useEffect } from "react";
import { api } from "../../api/client";
import { toast } from "react-hot-toast";
import { Loader2, Mail, UserPlus } from "lucide-react";

interface Role {
  id: number;
  name: string;
}

export default function InviteUserPage() {
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState<number | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingRoles, setFetchingRoles] = useState(true);

  // ✅ Fetch roles from backend
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await api.get("/roles/");
        setRoles(res.data);
      } catch {
        toast.error("Failed to load roles");
      } finally {
        setFetchingRoles(false);
      }
    };
    fetchRoles();
  }, []);

  // ✅ Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !roleId) {
      toast.error("Please provide an email and select a role");
      return;
    }

    setLoading(true);
    try {
      await api.post("/invites/", { email: email.trim(), role: roleId });
      toast.success(`Invite sent to ${email}`);
      setEmail("");
      setRoleId(null);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.email?.[0] ||
        err.response?.data?.detail ||
        err.response?.data?.error ||
        "Failed to send invite";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------------
  // ✅ UI
  // ------------------------------------------------------
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center justify-center w-14 h-14 bg-blue-100 rounded-full mb-3">
            <UserPlus className="w-7 h-7 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 text-center">
            Invite a New User
          </h2>
          <p className="text-gray-500 text-sm mt-1 text-center">
            Send an email invite to register a new team member.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Input */}
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
              <input
                type="email"
                className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Role Dropdown */}
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700">
              Role
            </label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
              value={roleId ?? ""}
              onChange={(e) => setRoleId(Number(e.target.value))}
              disabled={fetchingRoles}
              required
            >
              {fetchingRoles ? (
                <option>Loading roles...</option>
              ) : (
                <>
                  <option value="">Select a role</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full flex justify-center items-center bg-blue-600 text-white py-2.5 px-4 rounded-lg font-medium transition-all duration-200 ${
              loading
                ? "opacity-60 cursor-not-allowed"
                : "hover:bg-blue-700 active:scale-[0.98]"
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Sending Invite...
              </>
            ) : (
              "Send Invite"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
