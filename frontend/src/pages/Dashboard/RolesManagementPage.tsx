// 📂 src/pages/Dashboard/RolesPage.tsx
import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { ChevronDown, ChevronUp } from "lucide-react";

interface Role {
  id: number;
  name: string;
  description: string;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        setLoading(true);
        const res = await api.get("/roles/");
        setRoles(res.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || "Failed to load roles");
      } finally {
        setLoading(false);
      }
    };
    fetchRoles();
  }, []);

  const toggleDropdown = (roleId: number) => {
    setOpenDropdown(openDropdown === roleId ? null : roleId);
  };

  if (loading) return <p className="p-4">Loading roles...</p>;
  if (error) return <p className="p-4 text-red-500">{error}</p>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">🛡️ Roles</h1>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-3 w-16">ID</th>
              <th className="p-3">Role Name</th>
              <th className="p-3 text-center w-40">Description</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.id} className="border-t hover:bg-gray-50">
                <td className="p-3">{role.id}</td>
                <td className="p-3 font-medium text-gray-800">{role.name}</td>

                {/* Dropdown Button */}
                <td className="p-3 text-center relative">
                  <button
                    onClick={() => toggleDropdown(role.id)}
                    className="px-3 py-1 bg-gray-800 text-white rounded-md hover:bg-gray-700 flex items-center justify-center gap-1 mx-auto"
                  >
                    Description
                    {openDropdown === role.id ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </button>

                  {/* Dropdown Box */}
                  {openDropdown === role.id && (
                    <div className="absolute right-1/2 translate-x-1/2 mt-2 w-64 bg-white border border-gray-300 rounded-lg shadow-lg p-3 z-10">
                      <p className="text-sm text-gray-700">
                        {role.description || "No description provided."}
                      </p>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
