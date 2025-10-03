// 📂 src/pages/admin/UserCreatePage.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { toast } from "react-hot-toast";
import { useAuthStore } from "../../store/authStore";

interface Role {
  id: number;
  name: string;
  description?: string;
}

export default function UserCreatePage() {
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.access); // admin token

  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // User form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState<number | "">("");
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  // Optional student fields
  const [course, setCourse] = useState("");
  const [yearLevel, setYearLevel] = useState<number | "">("");
  const [studentId, setStudentId] = useState("");

  const [error, setError] = useState<string | null>(null);

  // Fetch roles
  useEffect(() => {
    const fetchRoles = async () => {
      if (!token) return;
      try {
        setLoading(true);
        const res = await api.get<Role[]>("/roles/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRoles(res.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || "Failed to load roles");
      } finally {
        setLoading(false);
      }
    };
    fetchRoles();
  }, [token]);

  const validateForm = () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("First and last name are required.");
      return false;
    }
    if (!email.trim()) {
      toast.error("Email is required.");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Invalid email format.");
      return false;
    }
    if (!roleId) {
      toast.error("Please select a role.");
      return false;
    }
    if (!password || !confirmPassword) {
      toast.error("Password and confirm password are required.");
      return false;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    if (!token) return toast.error("No admin token found.");

    try {
      setSaving(true);
      await api.post(
        "/users/register_self_service/",
        {
          first_name: firstName,
          last_name: lastName,
          email,
          password,
          confirm_password: confirmPassword,
          role_id: roleId,
          is_email_verified: isEmailVerified,
          course: course || undefined,
          year_level: yearLevel || undefined,
          student_id: studentId || undefined,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("User created successfully");
      navigate("/admin/users");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="p-4">Loading roles...</p>;
  if (error) return <p className="p-4 text-red-500">{error}</p>;

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Create New User</h1>
      <div className="space-y-4 bg-white p-4 shadow rounded">
        {/* First Name */}
        <div>
          <label className="block font-semibold mb-1">First Name</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        {/* Last Name */}
        <div>
          <label className="block font-semibold mb-1">Last Name</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block font-semibold mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        {/* Password */}
        <div>
          <label className="block font-semibold mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block font-semibold mb-1">Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        {/* Role */}
        <div>
          <label className="block font-semibold mb-1">Role</label>
          <select
            value={roleId}
            onChange={(e) => setRoleId(Number(e.target.value))}
            className="w-full border px-3 py-2 rounded"
          >
            <option value="">-- Select Role --</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </div>

        {/* Optional student fields */}
        {roleId === 1 /* assuming Student role id = 1 */ && (
          <>
            <div>
              <label className="block font-semibold mb-1">Course</label>
              <input
                type="text"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="w-full border px-3 py-2 rounded"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Year Level</label>
              <input
                type="number"
                value={yearLevel}
                onChange={(e) => setYearLevel(Number(e.target.value))}
                className="w-full border px-3 py-2 rounded"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Student ID</label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full border px-3 py-2 rounded"
              />
            </div>
          </>
        )}

        {/* Email Verified */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={isEmailVerified}
            onChange={(e) => setIsEmailVerified(e.target.checked)}
          />
          <label>Email Verified</label>
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
          >
            {saving && (
              <span className="animate-spin mr-2 border-2 border-white border-t-transparent rounded-full w-4 h-4" />
            )}
            Save
          </button>
          <button
            onClick={() => navigate("/admin/users")}
            className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
