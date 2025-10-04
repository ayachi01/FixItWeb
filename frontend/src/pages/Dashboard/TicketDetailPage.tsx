// 📂 src/pages/Dashboard/TicketDetailPage.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../api/client";

interface Role {
  id: number;
  name: string;
  description?: string;
}

interface StudentProfile {
  student_id?: string;
  course_code?: string;
  course_name?: string;
  year_level?: number;
  section?: string;
  college?: string;
  enrollment_year?: number;
}

interface UserProfile {
  student_profile?: StudentProfile;
  can_fix: boolean;
  can_assign: boolean;
  can_manage_users: boolean;
  is_admin_level: boolean;
}

interface User {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  is_email_verified: boolean;
  profile: UserProfile;
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [userRes, rolesRes] = await Promise.all([
          api.get<User>(`/users/${id}/`),
          api.get<Role[]>("/roles/"),
        ]);

        setUser({
          ...userRes.data,
          profile: userRes.data.profile ?? {
            student_profile: undefined,
            can_fix: false,
            can_assign: false,
            can_manage_users: false,
            is_admin_level: false,
          },
        });

        setRoles(rolesRes.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || "Failed to load user");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);

      // Build payload
      const payload: any = {
        full_name: user.full_name,
        email: user.email,
        role_id: user.role?.id,
        is_email_verified: user.is_email_verified,
      };

      // Include student profile if exists
      if (user.profile?.student_profile) {
        payload.profile = {
          student_profile: { ...user.profile.student_profile },
        };
      }

      // PATCH is safer for partial updates
      const res = await api.patch(`/users/${id}/`, payload);

      // Update local state with server response
      setUser({
        ...user,
        ...res.data,
        profile: res.data.profile ?? user.profile,
      });

      alert("User updated successfully");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="p-4">Loading user...</p>;
  if (error) return <p className="p-4 text-red-500">{error}</p>;
  if (!user) return <p className="p-4 text-red-500">User not found</p>;

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Edit User</h1>

      <div className="space-y-4 bg-white p-4 shadow rounded">
        {/* Full Name */}
        <div>
          <label className="block font-semibold mb-1">Full Name</label>
          <input
            type="text"
            value={user.full_name}
            onChange={(e) => setUser({ ...user, full_name: e.target.value })}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block font-semibold mb-1">Email</label>
          <input
            type="email"
            value={user.email}
            onChange={(e) => setUser({ ...user, email: e.target.value })}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        {/* Role */}
        <div>
          <label className="block font-semibold mb-1">Role</label>
          <select
            value={user.role?.id || ""}
            onChange={(e) => {
              const roleId = parseInt(e.target.value);
              const selectedRole = roles.find((r) => r.id === roleId);
              setUser({ ...user, role: selectedRole! });
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

        {/* Email Verified */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={user.is_email_verified}
            onChange={(e) =>
              setUser({ ...user, is_email_verified: e.target.checked })
            }
          />
          <label>Email Verified</label>
        </div>

        {/* Student Profile */}
        {user.profile?.student_profile && (
          <div className="border-t pt-4 space-y-2">
            <h2 className="text-lg font-semibold">Student Info</h2>

            {[
              { label: "Student ID", key: "student_id", disabled: true },
              { label: "Course Code", key: "course_code" },
              { label: "Course Name", key: "course_name" },
              { label: "Year Level", key: "year_level", type: "number" },
              { label: "Section", key: "section" },
              { label: "College", key: "college" },
              {
                label: "Enrollment Year",
                key: "enrollment_year",
                type: "number",
              },
            ].map((field) => (
              <div key={field.key}>
                <label className="block font-semibold mb-1">
                  {field.label}
                </label>
                <input
                  type={field.type || "text"}
                  value={
                    (user.profile?.student_profile as any)[field.key] ?? ""
                  }
                  disabled={field.disabled}
                  onChange={(e) =>
                    setUser({
                      ...user,
                      profile: {
                        ...user.profile!,
                        student_profile: {
                          ...user.profile.student_profile!,
                          [field.key]:
                            field.type === "number"
                              ? parseInt(e.target.value)
                              : e.target.value,
                        },
                      },
                    })
                  }
                  className={`w-full border px-3 py-2 rounded ${
                    field.disabled ? "bg-gray-100" : ""
                  }`}
                />
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
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
