// 📂 src/pages/Dashboard/RolesPage.tsx
import { useEffect, useState } from "react";
import { api } from "../../api/client";

interface Role {
  id: number;
  name: string;
  description: string;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        setLoading(true);
        const res = await api.get("/roles/"); // Adjust to your backend endpoint
        setRoles(res.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || "Failed to load roles");
      } finally {
        setLoading(false);
      }
    };
    fetchRoles();
  }, []);

  if (loading) return <p className="p-4">Loading roles...</p>;
  if (error) return <p className="p-4 text-red-500">{error}</p>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">🛡️ Roles</h1>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-2">ID</th>
              <th className="p-2">Role Name</th>
              <th className="p-2">Description</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.id} className="border-t hover:bg-gray-50">
                <td className="p-2">{role.id}</td>
                <td className="p-2">{role.name}</td>
                <td className="p-2">{role.description || "--"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
