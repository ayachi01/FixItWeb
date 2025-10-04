// 📂 src/pages/admin/UserDetailPage.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { toast } from "react-hot-toast"; // Use a toast library for notifications

interface Role {
  id: number;
  name: string;
  description?: string;
}

interface User {
  id?: number; // optional because new user won't have ID yet
  email: string;
  first_name: string;
  last_name: string;
  role?: Role;
  is_email_verified: boolean;
  course?: string; // for students
  year_level?: number; // for students
  student_id?: string; // for students
  password?: string;
  confirm_password?: string;
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [user, setUser] = useState<User>({
    email: "",
    first_name: "",
    last_name: "",
    role: undefined,
    is_email_verified: false,
  });
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCreate = id === "create";

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const rolesRes = await api.get<Role[]>("/roles/");
        setRoles(rolesRes.data);

        if (!isCreate && id) {
          const userRes = await api.get<User>(`/users/${id}/`);
          const fetchedUser = userRes.data;
          const [first, ...last] = (
            fetchedUser.first_name +
            " " +
            (fetchedUser.last_name || "")
          ).split(" ");
          setUser({
            ...fetchedUser,
            first_name: first || "",
            last_name: last.join(" ") || "",
          });
        }
      } catch (err: any) {
        setError(err.response?.data?.detail || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, isCreate]);

  const validateForm = () => {
    if (!user.first_name.trim() || !user.last_name.trim()) {
      toast.error("First and last name are required.");
      return false;
    }
    if (!user.email.trim()) {
      toast.error("Email is required.");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user.email)) {
      toast.error("Invalid email format.");
      return false;
    }
    if (!user.role?.id) {
      toast.error("Please select a role.");
      return false;
    }

    if (isCreate) {
      if (!user.password || !user.confirm_password) {
        toast.error("Password and confirm password are required.");
        return false;
      }
      if (user.password !== user.confirm_password) {
        toast.error("Passwords do not match.");
        return false;
      }
    }

    // Student-specific fields
    if (user.role?.name === "Student") {
      if (!user.course || !user.year_level || !user.student_id) {
        toast.error(
          "Students must provide course, year level, and student ID."
        );
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      if (isCreate) {
        // Create new user via self-service endpoint
        await api.post("/users/register_self_service/", {
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          password: user.password,
          confirm_password: user.confirm_password,
          role_id: user.role?.id,
          is_email_verified: user.is_email_verified,
          course: user.course,
          year_level: user.year_level,
          student_id: user.student_id,
        });
        toast.success("User created successfully");
      } else {
        // Update existing user
        await api.put(`/users/${id}/`, {
          full_name: `${user.first_name} ${user.last_name}`,
          email: user.email,
          role_id: user.role?.id,
          is_email_verified: user.is_email_verified,
          course: user.course,
          year_level: user.year_level,
          student_id: user.student_id,
        });
        toast.success("User updated successfully");
      }
      navigate("/dashboard/users");
    } catch (err: any) {
      toast.error(
        err.response?.data?.error ||
          err.response?.data?.detail ||
          "Failed to save user"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="p-4">Loading...</p>;
  if (error) return <p className="p-4 text-red-500">{error}</p>;

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">
        {isCreate ? "Create User" : "Edit User"}
      </h1>

      <div className="space-y-4 bg-white p-4 shadow rounded">
        {/* First Name */}
        <div>
          <label htmlFor="firstName" className="block font-semibold mb-1">
            First Name
          </label>
          <input
            id="firstName"
            type="text"
            value={user.first_name}
            onChange={(e) => setUser({ ...user, first_name: e.target.value })}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        {/* Last Name */}
        <div>
          <label htmlFor="lastName" className="block font-semibold mb-1">
            Last Name
          </label>
          <input
            id="lastName"
            type="text"
            value={user.last_name}
            onChange={(e) => setUser({ ...user, last_name: e.target.value })}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block font-semibold mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={user.email}
            onChange={(e) => setUser({ ...user, email: e.target.value })}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        {/* Password (only on create) */}
        {isCreate && (
          <>
            <div>
              <label htmlFor="password" className="block font-semibold mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={user.password || ""}
                onChange={(e) => setUser({ ...user, password: e.target.value })}
                className="w-full border px-3 py-2 rounded"
              />
            </div>
            <div>
              <label
                htmlFor="confirmPassword"
                className="block font-semibold mb-1"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={user.confirm_password || ""}
                onChange={(e) =>
                  setUser({ ...user, confirm_password: e.target.value })
                }
                className="w-full border px-3 py-2 rounded"
              />
            </div>
          </>
        )}

        {/* Role */}
        <div>
          <label htmlFor="role" className="block font-semibold mb-1">
            Role
          </label>
          <select
            id="role"
            value={user.role?.id || ""}
            onChange={(e) => {
              const roleId = parseInt(e.target.value);
              const selectedRole = roles.find((r) => r.id === roleId);
              setUser({ ...user, role: selectedRole });
            }}
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

        {/* Student-specific fields */}
        {user.role?.name === "Student" && (
          <>
            <div>
              <label htmlFor="course" className="block font-semibold mb-1">
                Course
              </label>
              <input
                id="course"
                type="text"
                value={user.course || ""}
                onChange={(e) => setUser({ ...user, course: e.target.value })}
                className="w-full border px-3 py-2 rounded"
              />
            </div>
            <div>
              <label htmlFor="yearLevel" className="block font-semibold mb-1">
                Year Level
              </label>
              <input
                id="yearLevel"
                type="number"
                value={user.year_level || ""}
                onChange={(e) =>
                  setUser({ ...user, year_level: parseInt(e.target.value) })
                }
                className="w-full border px-3 py-2 rounded"
              />
            </div>
            <div>
              <label htmlFor="studentId" className="block font-semibold mb-1">
                Student ID
              </label>
              <input
                id="studentId"
                type="text"
                value={user.student_id || ""}
                onChange={(e) =>
                  setUser({ ...user, student_id: e.target.value })
                }
                className="w-full border px-3 py-2 rounded"
              />
            </div>
          </>
        )}

        {/* Email Verified */}
        <div className="flex items-center space-x-2">
          <input
            id="emailVerified"
            type="checkbox"
            checked={user.is_email_verified}
            onChange={(e) =>
              setUser({ ...user, is_email_verified: e.target.checked })
            }
          />
          <label htmlFor="emailVerified">Email Verified</label>
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
            {isCreate ? "Create" : "Save"}
          </button>
          <button
            onClick={() => navigate("/dashboard/users")}
            className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
