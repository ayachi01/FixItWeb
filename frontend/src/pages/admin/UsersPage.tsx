// 📂 src/pages/admin/UsersPage.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";

interface Role {
  id: number;
  name: string;
  description?: string;
}

interface User {
  id: number;
  email: string;
  role: Role; // role is now an object
  is_email_verified: boolean;
  full_name?: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const res = await api.get("/users/"); // Adjust endpoint to your backend
        setUsers(res.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || "Failed to load users");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  if (loading) return <p className="p-4">Loading users...</p>;
  if (error) return <p className="p-4 text-red-500">{error}</p>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">👥 Users</h1>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-2">ID</th>
              <th className="p-2">Full Name</th>
              <th className="p-2">Email</th>
              <th className="p-2">Role</th>
              <th className="p-2">Verified</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t hover:bg-gray-50">
                <td className="p-2">{user.id}</td>
                <td className="p-2">{user.full_name || "--"}</td>
                <td className="p-2">{user.email}</td>
                <td className="p-2">{user.role?.name || "--"}</td>
                <td className="p-2">{user.is_email_verified ? "✅" : "❌"}</td>
                <td className="p-2">
                  <button
                    onClick={() => navigate(`/admin/users/${user.id}`)}
                    className="text-blue-600 hover:underline"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
